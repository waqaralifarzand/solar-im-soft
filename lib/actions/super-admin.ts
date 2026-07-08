"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { generateTempPassword } from "@/lib/generateTempPassword";
import { slugify } from "@/lib/slugify";
import { createCompanySchema, type CreateCompanyInput } from "@/lib/validations/super-admin";
import { IMPERSONATION_COOKIE_NAME, signImpersonationToken } from "@/lib/impersonation";

export async function createCompany(
  input: CreateCompanyInput,
): Promise<{ companyId: string; tempPassword: string }> {
  const actor = await requireSuperAdmin();
  const parsed = createCompanySchema.parse(input);

  const baseSlug = slugify(parsed.companyName) || "company";
  let candidateSlug = baseSlug;
  let suffix = 2;
  while (await prisma.company.findUnique({ where: { slug: candidateSlug } })) {
    candidateSlug = `${baseSlug}-${suffix++}`;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  let company;
  try {
    company = await prisma.company.create({
      data: {
        name: parsed.companyName,
        slug: candidateSlug,
        users: {
          create: {
            name: parsed.adminName,
            email: parsed.adminEmail,
            passwordHash,
            role: "ADMIN",
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("An account with this admin email already exists");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      userId: actor.userId,
      action: "company.create",
      entity: "Company",
      entityId: company.id,
      meta: { companyName: parsed.companyName, adminEmail: parsed.adminEmail },
    },
  });

  revalidatePath("/super/companies");
  revalidatePath("/super");

  return { companyId: company.id, tempPassword };
}

export async function suspendCompany(companyId: string): Promise<void> {
  const actor = await requireSuperAdmin();
  await prisma.company.update({ where: { id: companyId }, data: { status: "SUSPENDED" } });
  await prisma.auditLog.create({
    data: {
      companyId,
      userId: actor.userId,
      action: "company.suspend",
      entity: "Company",
      entityId: companyId,
    },
  });
  revalidatePath("/super/companies");
  revalidatePath(`/super/companies/${companyId}`);
  revalidatePath("/super");
}

export async function activateCompany(companyId: string): Promise<void> {
  const actor = await requireSuperAdmin();
  await prisma.company.update({ where: { id: companyId }, data: { status: "ACTIVE" } });
  await prisma.auditLog.create({
    data: {
      companyId,
      userId: actor.userId,
      action: "company.activate",
      entity: "Company",
      entityId: companyId,
    },
  });
  revalidatePath("/super/companies");
  revalidatePath(`/super/companies/${companyId}`);
  revalidatePath("/super");
}

export async function resetUserPassword(userId: string): Promise<{ tempPassword: string; email: string }> {
  const actor = await requireSuperAdmin();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: actor.userId,
      action: "user.password_reset",
      entity: "User",
      entityId: user.id,
      meta: { targetEmail: user.email },
    },
  });

  if (user.companyId) revalidatePath(`/super/companies/${user.companyId}`);
  return { tempPassword, email: user.email };
}

export async function startImpersonation(companyId: string, targetUserId: string): Promise<void> {
  const actor = await requireSuperAdmin();
  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, companyId, role: "ADMIN" },
  });
  if (!targetUser) {
    throw new Error("No admin user found for this company to impersonate");
  }

  const { token, maxAge } = await signImpersonationToken({
    companyId,
    targetUserId: targetUser.id,
    targetRole: targetUser.role,
    actualSuperAdminId: actor.userId,
  });

  cookies().set(IMPERSONATION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  await prisma.auditLog.create({
    data: {
      companyId,
      userId: actor.userId,
      action: "auth.impersonate",
      entity: "Company",
      entityId: companyId,
      meta: { targetUserId: targetUser.id, targetEmail: targetUser.email },
    },
  });

  // Deliberately not calling redirect() here: this is invoked directly from a client
  // event handler wrapped in try/catch for error display, and redirect() throws a
  // sentinel Next.js needs to catch itself — our own catch would swallow it. The
  // caller navigates client-side once this resolves.
}

export async function exitImpersonation(): Promise<void> {
  cookies().delete(IMPERSONATION_COOKIE_NAME);
}

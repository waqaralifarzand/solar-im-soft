"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { generateTempPassword } from "@/lib/generateTempPassword";
import { createCompanyUserSchema, type CreateCompanyUserInput } from "@/lib/validations/settings-users";

export async function createCompanyUser(
  input: CreateCompanyUserInput,
): Promise<{ tempPassword: string; email: string }> {
  const ctx = await requireRole("ADMIN");
  const parsed = createCompanyUserSchema.parse(input);

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role: parsed.role,
        companyId: ctx.companyId,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("An account with this email already exists");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "user.create",
      entity: "User",
      entityId: user.id,
      meta: { email: parsed.email, role: parsed.role },
    },
  });

  return { tempPassword, email: parsed.email };
}

export async function setCompanyUserStatus(userId: string, status: "ACTIVE" | "DISABLED"): Promise<void> {
  const ctx = await requireRole("ADMIN");
  if (userId === ctx.userId) {
    throw new Error("You can't disable your own account");
  }

  const user = await prisma.user.findFirst({ where: { id: userId, companyId: ctx.companyId } });
  if (!user) {
    throw new Error("User not found");
  }

  await prisma.user.update({ where: { id: userId }, data: { status } });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: status === "DISABLED" ? "user.disable" : "user.enable",
      entity: "User",
      entityId: userId,
    },
  });
}

export async function resetCompanyUserPassword(userId: string): Promise<{ tempPassword: string; email: string }> {
  const ctx = await requireRole("ADMIN");
  const user = await prisma.user.findFirst({ where: { id: userId, companyId: ctx.companyId } });
  if (!user) {
    throw new Error("User not found");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "user.password_reset",
      entity: "User",
      entityId: userId,
      meta: { targetEmail: user.email },
    },
  });

  return { tempPassword, email: user.email };
}

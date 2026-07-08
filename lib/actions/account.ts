"use server";

import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/account";

/**
 * Changes the password of whoever is actually authenticated right now — always the
 * real NextAuth session, never an impersonated identity (getTenantContext() would
 * return the impersonated user's id instead, which is wrong for "my own password").
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  const parsed = changePasswordSchema.parse(input);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.userId } });
  const currentValid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
  if (!currentValid) {
    throw new Error("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(parsed.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      action: "user.password_change",
      entity: "User",
      entityId: user.id,
    },
  });
}

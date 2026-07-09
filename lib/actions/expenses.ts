"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { createExpenseSchema, type CreateExpenseInput } from "@/lib/validations/expenses";

const EXPENSE_ROLES = ["ADMIN", "MANAGER"] as const;

export async function createExpense(input: CreateExpenseInput): Promise<{ id: string }> {
  const ctx = await requireRole(...EXPENSE_ROLES);
  const parsed = createExpenseSchema.parse(input);

  const expense = await prisma.expense.create({
    data: {
      companyId: ctx.companyId,
      category: parsed.category,
      amount: parsed.amount,
      note: parsed.note || null,
      date: new Date(parsed.date),
      createdBy: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: ctx.companyId,
      userId: ctx.impersonatedBy ?? ctx.userId,
      action: "expense.create",
      entity: "Expense",
      entityId: expense.id,
      meta: { category: parsed.category, amount: parsed.amount.toString() },
    },
  });

  return { id: expense.id };
}

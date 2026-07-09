import { prisma } from "@/lib/prisma";

export interface ExpenseRow {
  id: string;
  category: string;
  amount: string;
  note: string | null;
  date: Date;
  createdByName: string;
}

/** month is "YYYY-MM"; omit to return all expenses for the company. */
export async function listExpenses(companyId: string, month?: string): Promise<ExpenseRow[]> {
  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    // UTC explicitly: `date` columns are stored as UTC instants, and the server's local
    // timezone isn't guaranteed to be UTC — a local-time boundary could shift the range by
    // hours and mis-bucket expenses near the start/end of a month.
    dateFilter = { gte: new Date(Date.UTC(year, mon - 1, 1)), lt: new Date(Date.UTC(year, mon, 1)) };
  }

  const expenses = await prisma.expense.findMany({
    where: { companyId, ...(dateFilter ? { date: dateFilter } : {}) },
    orderBy: { date: "desc" },
  });

  const userIds = [...new Set(expenses.map((e) => e.createdBy))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  return expenses.map((e) => ({
    id: e.id,
    category: e.category,
    amount: e.amount.toString(),
    note: e.note,
    date: e.date,
    createdByName: userById.get(e.createdBy) ?? "Unknown",
  }));
}

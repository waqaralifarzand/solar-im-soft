import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { listExpenses } from "@/lib/queries/expenses";
import { CreateExpenseForm } from "@/components/expenses/create-expense-form";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { MonthFilter } from "@/components/expenses/month-filter";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ExpensesPage({ searchParams }: { searchParams: { month?: string } }) {
  const ctx = await requireRole("ADMIN", "MANAGER");

  const month = searchParams.month === "all" ? undefined : (searchParams.month ?? currentMonth());

  const [expenses, company] = await Promise.all([
    listExpenses(ctx.companyId, month),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
      select: { currency: true, lakhCroreFormat: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-foreground">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track company expenses by category.</p>
      </div>
      <CreateExpenseForm />
      <MonthFilter month={month ?? ""} />
      <ExpensesTable expenses={expenses} currency={company.currency} lakhCroreFormat={company.lakhCroreFormat} />
    </div>
  );
}

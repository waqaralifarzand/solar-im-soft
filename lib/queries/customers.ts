import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: string;
  createdAt: Date;
}

export async function listCustomersWithBalance(companyId: string): Promise<CustomerRow[]> {
  const customers = await prisma.customer.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  const balances = await prisma.ledgerEntry.groupBy({
    by: ["customerId"],
    where: { companyId },
    _sum: { debit: true, credit: true },
  });
  const balanceMap = new Map<string, Prisma.Decimal>();
  for (const b of balances) {
    const debit = b._sum.debit ?? new Prisma.Decimal(0);
    const credit = b._sum.credit ?? new Prisma.Decimal(0);
    balanceMap.set(b.customerId, debit.minus(credit));
  }

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    balance: (balanceMap.get(c.id) ?? new Prisma.Decimal(0)).toString(),
    createdAt: c.createdAt,
  }));
}

export interface LedgerRow {
  id: string;
  createdAt: Date;
  type: string;
  debit: string;
  credit: string;
  runningBalance: string;
  note: string | null;
  refId: string | null;
  userName: string;
}

export interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    openingBalance: string;
  };
  ledger: LedgerRow[];
  balance: string;
}

export async function getCustomerDetail(
  companyId: string,
  customerId: string,
): Promise<CustomerDetail | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId, deletedAt: null },
  });
  if (!customer) return null;

  const entries = await prisma.ledgerEntry.findMany({
    where: { companyId, customerId },
    orderBy: { createdAt: "asc" },
  });

  const userIds = [...new Set(entries.map((e) => e.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userById = new Map(users.map((u) => [u.id, u.name]));

  let running = new Prisma.Decimal(0);
  const ledger: LedgerRow[] = entries.map((e) => {
    running = running.plus(e.debit).minus(e.credit);
    return {
      id: e.id,
      createdAt: e.createdAt,
      type: e.type,
      debit: e.debit.toString(),
      credit: e.credit.toString(),
      runningBalance: running.toString(),
      note: e.note,
      refId: e.refId,
      userName: userById.get(e.userId) ?? "Unknown",
    };
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      openingBalance: customer.openingBalance.toString(),
    },
    ledger,
    balance: running.toString(),
  };
}

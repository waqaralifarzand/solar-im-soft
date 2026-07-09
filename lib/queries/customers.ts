import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: string;
  createdAt: Date;
}

export async function listCustomersForCompany(companyId: string): Promise<CustomerRow[]> {
  const customers = await prisma.customer.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      ledgerEntries: {
        select: { debit: true, credit: true },
      },
    },
  });

  return customers.map((c) => {
    let balance = new Prisma.Decimal(0);
    for (const entry of c.ledgerEntries) {
      balance = balance.add(entry.debit).sub(entry.credit);
    }
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      balance: balance.toString(),
      createdAt: c.createdAt,
    };
  });
}

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  openingBalance: string;
  createdAt: Date;
}

export interface LedgerRow {
  id: string;
  type: string;
  debit: string;
  credit: string;
  runningBalance: string;
  note: string | null;
  refId: string | null;
  userName: string;
  createdAt: Date;
}

export async function getCustomerDetail(
  companyId: string,
  customerId: string,
): Promise<{ customer: CustomerDetail; ledger: LedgerRow[] } | null> {
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
    running = running.add(e.debit).sub(e.credit);
    return {
      id: e.id,
      type: e.type,
      debit: e.debit.toString(),
      credit: e.credit.toString(),
      runningBalance: running.toString(),
      note: e.note,
      refId: e.refId,
      userName: userById.get(e.userId) ?? "Unknown",
      createdAt: e.createdAt,
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
      createdAt: customer.createdAt,
    },
    ledger,
  };
}

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export async function listSuppliersForCompany(companyId: string): Promise<SupplierRow[]> {
  const suppliers = await prisma.supplier.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { name: "asc" },
  });
  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    address: s.address,
  }));
}

export async function getSupplierDetail(companyId: string, supplierId: string) {
  return prisma.supplier.findFirst({
    where: { id: supplierId, companyId, deletedAt: null },
  });
}

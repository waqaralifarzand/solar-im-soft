import { prisma } from "@/lib/prisma";

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export async function listSuppliers(companyId: string): Promise<SupplierRow[]> {
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

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL;
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD;
  if (!superAdminEmail || !superAdminPassword) {
    throw new Error("SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD must be set");
  }

  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: "Super Admin",
      email: superAdminEmail,
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      companyId: null,
    },
  });
  console.log(`Super admin ready: ${superAdminEmail}`);

  // Demo fixtures for exercising the Phase 0 done checklist (active company shell + suspended lock screen).
  const demoPasswordHash = await bcrypt.hash("demo1234", 10);

  const activeCompany = await prisma.company.upsert({
    where: { slug: "demo-solar" },
    update: {},
    create: {
      name: "Demo Solar Co",
      slug: "demo-solar",
      status: "ACTIVE",
      onboardingComplete: true,
    },
  });
  await prisma.user.upsert({
    where: { email: "admin@demo-solar.test" },
    update: {},
    create: {
      name: "Demo Admin",
      email: "admin@demo-solar.test",
      passwordHash: demoPasswordHash,
      role: "ADMIN",
      companyId: activeCompany.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "manager@demo-solar.test" },
    update: {},
    create: {
      name: "Demo Manager",
      email: "manager@demo-solar.test",
      passwordHash: demoPasswordHash,
      role: "MANAGER",
      companyId: activeCompany.id,
    },
  });
  await prisma.user.upsert({
    where: { email: "cashier@demo-solar.test" },
    update: {},
    create: {
      name: "Demo Cashier",
      email: "cashier@demo-solar.test",
      passwordHash: demoPasswordHash,
      role: "CASHIER",
      companyId: activeCompany.id,
    },
  });
  console.log("Demo active company users ready (password demo1234): admin@demo-solar.test, manager@demo-solar.test, cashier@demo-solar.test");

  const suspendedCompany = await prisma.company.upsert({
    where: { slug: "suspended-solar" },
    update: {},
    create: {
      name: "Suspended Solar Co",
      slug: "suspended-solar",
      status: "SUSPENDED",
      onboardingComplete: true,
    },
  });
  await prisma.user.upsert({
    where: { email: "admin@suspended-solar.test" },
    update: {},
    create: {
      name: "Suspended Admin",
      email: "admin@suspended-solar.test",
      passwordHash: demoPasswordHash,
      role: "ADMIN",
      companyId: suspendedCompany.id,
    },
  });
  console.log("Demo suspended company admin ready: admin@suspended-solar.test / demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

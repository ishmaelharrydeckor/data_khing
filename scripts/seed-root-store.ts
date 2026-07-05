import { PrismaClient, Role, AccountType, UserStatus, StoreStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting root store seeding...");

  // 1. Check if ROOT user already exists
  const existingRootUser = await prisma.user.findFirst({
    where: { accountType: AccountType.ROOT },
  });

  let adminUser = existingRootUser;

  if (!existingRootUser) {
    const adminEmail = "admin@datakhing.com";
    adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      console.log(`Creating default admin user: ${adminEmail}`);
      const passwordHash = await bcrypt.hash("admin1234", 10);
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: "Platform Admin",
          passwordHash,
          role: Role.ADMIN,
          accountType: AccountType.ROOT,
          status: UserStatus.ACTIVE,
          ancestorPath: "root",
        },
      });
    } else {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          accountType: AccountType.ROOT,
          status: UserStatus.ACTIVE,
        },
      });
    }
  }

  if (!adminUser) {
    throw new Error("Failed to initialize or retrieve root admin user.");
  }

  // 2. Check if admin user's root storefront exists
  let rootStore = await prisma.store.findFirst({
    where: { ownerUserId: adminUser.id },
  });

  if (!rootStore) {
    console.log("Creating default root storefront skin...");
    rootStore = await prisma.store.create({
      data: {
        ownerUserId: adminUser.id,
        slug: "root",
        name: "DataKhing Root Store",
        status: StoreStatus.ACTIVE,
        displayName: "DataKhing",
        primaryColor: "#4F46E5",
        supportEmail: "support@datakhing.com",
        contactPhone: "0240000000",
        footerText: "© 2026 DataKhing. All rights reserved.",
      },
    });
    console.log(`Successfully seeded root storefront! ID: ${rootStore.id}`);
  } else {
    console.log(`Root storefront already exists: ${rootStore.id} (slug: ${rootStore.slug})`);
  }

  // 3. Create standard Bundles and associate prices
  const bundlesData = [
    { id: "mtn-1gb", network: "YELLO" as const, label: "MTN 1GB", dataAmountGB: 1.0, customer: 400, agent: 350 },
    { id: "mtn-5gb", network: "YELLO" as const, label: "MTN 5GB", dataAmountGB: 5.0, customer: 1500, agent: 1300 },
    { id: "mtn-10gb", network: "YELLO" as const, label: "MTN 10GB", dataAmountGB: 10.0, customer: 2800, agent: 2400 },
    { id: "telecel-2gb", network: "TELECEL" as const, label: "Telecel 2GB", dataAmountGB: 2.0, customer: 700, agent: 600 },
    { id: "telecel-5gb", network: "TELECEL" as const, label: "Telecel 5GB", dataAmountGB: 5.0, customer: 1400, agent: 1200 },
    { id: "at-3gb", network: "AT_PREMIUM" as const, label: "AirtelTigo 3GB", dataAmountGB: 3.0, customer: 800, agent: 700 },
  ];

  for (const b of bundlesData) {
    const existingBundle = await prisma.bundle.findUnique({ where: { id: b.id } });
    if (!existingBundle) {
      await prisma.bundle.create({
        data: {
          id: b.id,
          network: b.network,
          label: b.label,
          dataAmountGB: b.dataAmountGB,
          active: true,
        }
      });
    }

    // Seed pricing for Root Admin User
    await prisma.userPricing.upsert({
      where: {
        userId_bundleId: { userId: adminUser.id, bundleId: b.id },
      },
      update: {},
      create: {
        userId: adminUser.id,
        bundleId: b.id,
        priceForCustomersPesewas: b.customer,
        priceForSubAgentsPesewas: b.agent,
      }
    });
  }

  // Create initial supplier account
  const existingSupplier = await prisma.supplierAccount.findFirst();
  if (!existingSupplier) {
    await prisma.supplierAccount.create({
      data: {
        balancePesewas: 1000000, // 10,000 GHS starting mock balance
        rateLimitRemaining: 60,
      }
    });
    console.log("Initialized supplier account balance.");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

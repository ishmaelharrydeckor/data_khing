import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting database backup before schema migration...");

  try {
    const users = await prisma.user.findMany();
    const stores = await prisma.store.findMany();
    const pricings = await prisma.userPricing.findMany();
    const applications = await prisma.agentApplication.findMany();
    const ledgers = await prisma.ledger.findMany();
    const withdrawals = await prisma.withdrawal.findMany();
    const orders = await prisma.order.findMany();
    const bundles = await prisma.bundle.findMany();
    const supplierAccounts = await prisma.supplierAccount.findMany();
    const walletTransactions = await prisma.walletTransaction.findMany();

    const backupData = {
      timestamp: new Date().toISOString(),
      users,
      stores,
      pricings,
      applications,
      ledgers,
      withdrawals,
      orders,
      bundles,
      supplierAccounts,
      walletTransactions,
    };

    const backupPath = path.join(__dirname, "../backup-before-hierarchy-migration.json");
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");

    console.log(`Backup successfully completed! File saved at: ${backupPath}`);
    console.log(`Summary:`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Stores: ${stores.length}`);
    console.log(`- Pricings: ${pricings.length}`);
    console.log(`- Applications: ${applications.length}`);
    console.log(`- Ledgers: ${ledgers.length}`);
    console.log(`- Withdrawals: ${withdrawals.length}`);
    console.log(`- Orders: ${orders.length}`);
  } catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
  }
}

main();

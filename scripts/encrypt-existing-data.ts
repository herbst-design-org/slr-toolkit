/**
 * One-time migration: re-saves all rows that have /// @encrypted fields so
 * that values written before field encryption was enabled get encrypted.
 *
 * Reading decrypts (or passes plaintext through), writing always encrypts,
 * so this script is idempotent and safe to re-run.
 *
 * Usage (needs DATABASE_URL and PRISMA_FIELD_ENCRYPTION_KEY, e.g. from .env):
 *   npx tsx scripts/encrypt-existing-data.ts
 */
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "prisma-field-encryption";
import { existsSync } from "fs";

if (!process.env.DATABASE_URL && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const db = new PrismaClient().$extends(fieldEncryptionExtension());

async function main() {
  const contentProviders = await db.contentProvider.findMany({
    select: { id: true, apiKey: true },
  });
  for (const { id, apiKey } of contentProviders) {
    await db.contentProvider.update({ where: { id }, data: { apiKey } });
  }
  console.log(`Re-encrypted ${contentProviders.length} ContentProvider row(s)`);

  const vectorProviders = await db.vectorProvider.findMany({
    select: { id: true, apiKey: true },
  });
  for (const { id, apiKey } of vectorProviders) {
    await db.vectorProvider.update({ where: { id }, data: { apiKey } });
  }
  console.log(`Re-encrypted ${vectorProviders.length} VectorProvider row(s)`);
}

main()
  .then(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    void db.$disconnect();
    process.exit(1);
  });

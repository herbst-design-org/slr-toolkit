/*
  Warnings:

  - The values [MENDLEY] on the enum `ContentProviderType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContentProviderType_new" AS ENUM ('ZOTERO', 'MENDELEY', 'ENDNOTE');
ALTER TABLE "ContentProvider" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "ContentProvider" ALTER COLUMN "type" TYPE "ContentProviderType_new" USING ("type"::text::"ContentProviderType_new");
ALTER TYPE "ContentProviderType" RENAME TO "ContentProviderType_old";
ALTER TYPE "ContentProviderType_new" RENAME TO "ContentProviderType";
DROP TYPE "ContentProviderType_old";
ALTER TABLE "ContentProvider" ALTER COLUMN "type" SET DEFAULT 'ZOTERO';
COMMIT;

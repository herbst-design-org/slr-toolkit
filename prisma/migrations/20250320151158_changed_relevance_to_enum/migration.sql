/*
  Warnings:

  - The `relevant` column on the `ItemOnSLR` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Relevance" AS ENUM ('RELEVANT', 'IRRELEVANT', 'UNKNOWN');

-- AlterTable
ALTER TABLE "ItemOnSLR" DROP COLUMN "relevant",
ADD COLUMN     "relevant" "Relevance" NOT NULL DEFAULT 'UNKNOWN';

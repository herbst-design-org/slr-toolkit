/*
  Warnings:

  - Made the column `internalId` on table `ItemOnSLR` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ItemOnSLR" ALTER COLUMN "internalId" SET NOT NULL;

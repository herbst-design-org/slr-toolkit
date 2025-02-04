/*
  Warnings:

  - Added the required column `externalId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "externalId" TEXT NOT NULL;

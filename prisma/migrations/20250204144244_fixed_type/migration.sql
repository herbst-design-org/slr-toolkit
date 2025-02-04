/*
  Warnings:

  - You are about to drop the column `externaleId` on the `Collection` table. All the data in the column will be lost.
  - Added the required column `externalId` to the `Collection` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Collection" DROP COLUMN "externaleId",
ADD COLUMN     "externalId" TEXT NOT NULL;

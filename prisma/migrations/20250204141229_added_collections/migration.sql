/*
  Warnings:

  - You are about to drop the column `providerId` on the `Item` table. All the data in the column will be lost.
  - Added the required column `collectionId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_providerId_fkey";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "providerId",
ADD COLUMN     "collectionId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "lastSyncedVersion" INTEGER NOT NULL DEFAULT 0,
    "isSynced" BOOLEAN NOT NULL DEFAULT true,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ContentProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

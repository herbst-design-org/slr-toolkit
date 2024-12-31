/*
  Warnings:

  - Added the required column `providerId` to the `Item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "providerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ContentProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

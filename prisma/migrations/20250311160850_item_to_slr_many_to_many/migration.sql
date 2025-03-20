/*
  Warnings:

  - You are about to drop the column `slrId` on the `Item` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_slrId_fkey";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "slrId";

-- CreateTable
CREATE TABLE "_ItemToSLR" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ItemToSLR_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ItemToSLR_B_index" ON "_ItemToSLR"("B");

-- AddForeignKey
ALTER TABLE "_ItemToSLR" ADD CONSTRAINT "_ItemToSLR_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToSLR" ADD CONSTRAINT "_ItemToSLR_B_fkey" FOREIGN KEY ("B") REFERENCES "SLR"("id") ON DELETE CASCADE ON UPDATE CASCADE;

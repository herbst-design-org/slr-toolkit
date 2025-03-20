/*
  Warnings:

  - You are about to drop the `_ItemToSLR` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ItemToSLR" DROP CONSTRAINT "_ItemToSLR_A_fkey";

-- DropForeignKey
ALTER TABLE "_ItemToSLR" DROP CONSTRAINT "_ItemToSLR_B_fkey";

-- DropTable
DROP TABLE "_ItemToSLR";

-- CreateTable
CREATE TABLE "ItemOnSLR" (
    "itemId" TEXT NOT NULL,
    "slrId" TEXT NOT NULL,
    "relevant" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ItemOnSLR_pkey" PRIMARY KEY ("itemId","slrId")
);

-- AddForeignKey
ALTER TABLE "ItemOnSLR" ADD CONSTRAINT "ItemOnSLR_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOnSLR" ADD CONSTRAINT "ItemOnSLR_slrId_fkey" FOREIGN KEY ("slrId") REFERENCES "SLR"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

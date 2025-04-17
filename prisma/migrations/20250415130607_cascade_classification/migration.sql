-- DropForeignKey
ALTER TABLE "Classification" DROP CONSTRAINT "Classification_itemOnSlrId_fkey";

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_itemOnSlrId_fkey" FOREIGN KEY ("itemOnSlrId") REFERENCES "ItemOnSLR"("internalId") ON DELETE CASCADE ON UPDATE CASCADE;

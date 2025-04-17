-- DropForeignKey
ALTER TABLE "Probability" DROP CONSTRAINT "Probability_classificationId_fkey";

-- AddForeignKey
ALTER TABLE "Probability" ADD CONSTRAINT "Probability_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

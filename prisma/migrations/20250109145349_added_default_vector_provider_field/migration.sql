/*
  Warnings:

  - Added the required column `defaultVectorProviderId` to the `SLR` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SLR" ADD COLUMN     "defaultVectorProviderId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SLR" ADD CONSTRAINT "SLR_defaultVectorProviderId_fkey" FOREIGN KEY ("defaultVectorProviderId") REFERENCES "VectorProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

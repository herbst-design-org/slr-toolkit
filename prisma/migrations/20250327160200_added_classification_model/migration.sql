/*
  Warnings:

  - A unique constraint covering the columns `[internalId]` on the table `ItemOnSLR` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ItemOnSLR" ADD COLUMN     "internalId" TEXT;

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "prediction" TEXT NOT NULL,
    "itemOnSlrId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Probability" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "classificationId" TEXT NOT NULL,

    CONSTRAINT "Probability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemOnSLR_internalId_key" ON "ItemOnSLR"("internalId");

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_itemOnSlrId_fkey" FOREIGN KEY ("itemOnSlrId") REFERENCES "ItemOnSLR"("internalId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Probability" ADD CONSTRAINT "Probability_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

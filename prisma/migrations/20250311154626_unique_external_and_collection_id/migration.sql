/*
  Warnings:

  - A unique constraint covering the columns `[externalId,collectionId]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Item_externalId_collectionId_key" ON "Item"("externalId", "collectionId");

/*
  Warnings:

  - A unique constraint covering the columns `[externalId,providerId]` on the table `Collection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Collection_externalId_providerId_key" ON "Collection"("externalId", "providerId");

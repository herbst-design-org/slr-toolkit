/*
  Warnings:

  - A unique constraint covering the columns `[type,userId,libraryId]` on the table `ContentProvider` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ContentProvider" ADD COLUMN     "libraryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ContentProvider_type_userId_libraryId_key" ON "ContentProvider"("type", "userId", "libraryId");

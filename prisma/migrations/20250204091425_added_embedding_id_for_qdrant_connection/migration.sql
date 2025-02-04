/*
  Warnings:

  - You are about to drop the column `embedding` on the `ItemVector` table. All the data in the column will be lost.
  - Added the required column `embeddingId` to the `ItemVector` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ItemVector" DROP COLUMN "embedding",
ADD COLUMN     "embeddingId" TEXT NOT NULL;

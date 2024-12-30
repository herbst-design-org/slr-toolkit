-- CreateEnum
CREATE TYPE "LibraryType" AS ENUM ('user', 'group');

-- AlterTable
ALTER TABLE "ContentProvider" ADD COLUMN     "libraryType" "LibraryType";

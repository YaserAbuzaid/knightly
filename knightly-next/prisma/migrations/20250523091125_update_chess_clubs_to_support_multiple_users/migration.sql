/*
  Warnings:

  - You are about to drop the column `userId` on the `chessClubs` table. All the data in the column will be lost.

*/
-- First, add the userIds column before dropping userId to preserve data
ALTER TABLE "chessClubs" ADD COLUMN "userIds" TEXT[] DEFAULT '{}';

-- Update userIds to include the current userId for each club
UPDATE "chessClubs" SET "userIds" = array_append("userIds", "userId");

-- DropForeignKey
ALTER TABLE "chessClubs" DROP CONSTRAINT "chessClubs_userId_fkey";

-- DropIndex
DROP INDEX "chessClubs_userId_idx";

-- AlterTable
ALTER TABLE "chessClubs" DROP COLUMN "userId",
ALTER COLUMN "userIds" DROP DEFAULT;

-- CreateTable
CREATE TABLE "_UserToChessClubs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserToChessClubs_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserToChessClubs_B_index" ON "_UserToChessClubs"("B");

-- AddForeignKey
ALTER TABLE "_UserToChessClubs" ADD CONSTRAINT "_UserToChessClubs_A_fkey" FOREIGN KEY ("A") REFERENCES "chessClubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserToChessClubs" ADD CONSTRAINT "_UserToChessClubs_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Populate the many-to-many relation table
INSERT INTO "_UserToChessClubs" ("A", "B")
SELECT "id", unnest("userIds") FROM "chessClubs";

/*
  Warnings:

  - You are about to drop the `ChessClubs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChessClubs" DROP CONSTRAINT "ChessClubs_userId_fkey";

-- DropTable
DROP TABLE "ChessClubs";

-- CreateTable
CREATE TABLE "chessClubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "url" TEXT,
    "description" TEXT,
    "memberCount" INTEGER,
    "joinedAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3),
    "platform" TEXT NOT NULL,
    "platformId" TEXT,
    "userId" TEXT NOT NULL,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admins" TEXT[],

    CONSTRAINT "chessClubs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chessClubs_platform_platformId_idx" ON "chessClubs"("platform", "platformId");

-- CreateIndex
CREATE INDEX "chessClubs_userId_idx" ON "chessClubs"("userId");

-- AddForeignKey
ALTER TABLE "chessClubs" ADD CONSTRAINT "chessClubs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

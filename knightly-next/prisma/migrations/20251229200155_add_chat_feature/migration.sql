-- CreateTable
CREATE TABLE "chat_channel" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eloMin" INTEGER NOT NULL,
    "eloMax" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_channel_clubId_idx" ON "chat_channel"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_channel_clubId_eloMin_eloMax_key" ON "chat_channel"("clubId", "eloMin", "eloMax");

-- CreateIndex
CREATE INDEX "chat_message_channelId_idx" ON "chat_message"("channelId");

-- CreateIndex
CREATE INDEX "chat_message_userId_idx" ON "chat_message"("userId");

-- AddForeignKey
ALTER TABLE "chat_channel" ADD CONSTRAINT "chat_channel_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "chessClubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "chat_channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

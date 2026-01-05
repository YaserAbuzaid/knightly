import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ClubChatClient } from "./ClubChatClient";
import { ELO_RANGES } from "@/lib/chat-types";
import { AlertCircle, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PageProps {
  params: Promise<{ club: string }>;
}

async function getClubWithChannels(clubId: string) {
  const club = await prisma.chessClubs.findUnique({
    where: { id: clubId },
    include: {
      chatChannels: {
        orderBy: { eloMin: "asc" },
      },
    },
  });

  if (!club) {
    return null;
  }

  // If no channels exist, create default ones
  if (club.chatChannels.length === 0) {
    const channelData = ELO_RANGES.map((range) => ({
      clubId,
      name: `${range.name} (${range.min}-${
        range.max === 9999 ? "∞" : range.max
      })`,
      eloMin: range.min,
      eloMax: range.max,
    }));

    await prisma.chatChannel.createMany({
      data: channelData,
    });

    // Refetch with channels
    return prisma.chessClubs.findUnique({
      where: { id: clubId },
      include: {
        chatChannels: {
          orderBy: { eloMin: "asc" },
        },
      },
    });
  }

  return club;
}

function ClubNotFound({ clubId }: { clubId: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Club Not Found</h1>
        <p className="text-muted-foreground">
          The club{" "}
          <span className="font-mono bg-muted px-2 py-1 rounded">{clubId}</span>{" "}
          doesn't exist or hasn't been synced yet.
        </p>
        <div className="flex flex-col gap-2 mt-4 w-full">
          <p className="text-sm text-muted-foreground">
            To access club chat, make sure you:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside text-left">
            <li>Have linked your Chess.com or Lichess account</li>
            <li>Are a member of the club on the platform</li>
            <li>Have synced your clubs from your profile</li>
          </ul>
        </div>
      </div>
      <div className="flex gap-4">
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </Link>
        <Link href="/home">
          <Button>
            <Users className="h-4 w-4 mr-2" />
            View My Clubs
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default async function ClubPage({ params }: PageProps) {
  const { club: clubId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const club = await getClubWithChannels(clubId);

  // Show friendly error instead of 404
  if (!club) {
    return <ClubNotFound clubId={clubId} />;
  }

  // TODO: Get user's ELO from their chess platform
  // For now, we'll pass undefined and let the component handle it
  const userElo = undefined;

  return (
    <div className="w-full h-full flex flex-col">
      <ClubChatClient
        clubId={club.id}
        clubName={club.name}
        channels={club.chatChannels.map((ch) => ({
          id: ch.id,
          clubId: ch.clubId,
          name: ch.name,
          eloMin: ch.eloMin,
          eloMax: ch.eloMax,
          createdAt: ch.createdAt,
        }))}
        userElo={userElo}
      />
    </div>
  );
}

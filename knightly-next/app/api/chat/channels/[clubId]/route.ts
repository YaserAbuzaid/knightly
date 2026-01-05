import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ELO_RANGES } from "@/lib/chat-types";

// GET /api/chat/channels/[clubId] - Get channels for a club (create if none exist)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;

    if (!clubId) {
      return NextResponse.json(
        { error: "Club ID is required" },
        { status: 400 }
      );
    }

    // Check if club exists
    const club = await prisma.chessClubs.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get existing channels
    let channels = await prisma.chatChannel.findMany({
      where: { clubId },
      orderBy: { eloMin: "asc" },
    });

    // If no channels exist, create default ones based on ELO ranges
    if (channels.length === 0) {
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

      channels = await prisma.chatChannel.findMany({
        where: { clubId },
        orderBy: { eloMin: "asc" },
      });
    }

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/chat/messages/[channelId] - Get messages for a channel with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const cursor = searchParams.get("cursor");

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    // Check if channel exists
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Build query
    const whereClause: any = {
      channelId,
      isDeleted: false,
    };

    if (cursor) {
      whereClause.createdAt = {
        lt: new Date(cursor),
      };
    }

    // Fetch messages
    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            chessUsername: true,
            chessPlatform: true,
            flagCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to check if there are more
    });

    // Check if there are more messages
    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra item
    }

    // Reverse to get chronological order
    const chronologicalMessages = messages.reverse();

    // Get next cursor
    const nextCursor =
      hasMore && chronologicalMessages.length > 0
        ? chronologicalMessages[0].createdAt.toISOString()
        : undefined;

    return NextResponse.json({
      messages: chronologicalMessages,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

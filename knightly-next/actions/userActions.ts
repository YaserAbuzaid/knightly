"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clubData, updateUserData } from "@/lib/user-types";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_cacheTag as cacheTag, revalidateTag } from "next/cache";

export const getUser = async (userId: string) => {
  "use cache";
  cacheTag("user-data");
  try {
    const user = prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        chessClubs: true,
      },
    });
    return user;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(e.message);
      return e.message;
    } else if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error(e.message);
      return e.message;
    } else {
      console.error("Unexpected error:", e);
      return "Unexpected error occurred";
    }
  }
};

export const updateUser = async (data: updateUserData) => {
  const user = await auth.api.getSession({
    headers: await headers(),
  });

  if (!user || user == null) {
    console.error("Please sign in to continue.");
    redirect("/sign-in");
  }

  const userId = user.user.id;

  try {
    if (data.platform === "lichess") {
      const updatedUser = prisma.user.update({
        where: { id: userId },
        data: {
          name: data.username,
          chessUsername: data.username,
          chessPlatform: data.platform,
        },
      });

      return updatedUser;
    } else {
      data.platform === "chess.com";
    }
    {
      const updatedUser = prisma.user.update({
        where: { id: userId },
        data: {
          name: data.username,
          chessUsername: data.username,
          chessPlatform: data.platform,
          image: data.image,
        },
      });

      revalidateTag("user-data");

      return updatedUser;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(e.message);
      return e.message;
    } else if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error(e.message);
      return e.message;
    } else {
      console.error("Unexpected error:", e);
      return "Unexpected error occurred";
    }
  }
};

export const upsertUserClubs = async (
  data: clubData[],
  userId: string,
  platform: string
) => {
  try {
    // Process clubs one by one with upsert
    const results = await Promise.all(
      data.map(async (d) => {
        // First check if the club already exists
        const existingClub = await prisma.chessClubs.findUnique({
          where: { id: d.club_id.toString() },
        });

        if (existingClub) {
          // Club exists, check if user is already a member
          if (!existingClub.userIds.includes(userId)) {
            // User is not a member, add them to the userIds array
            return prisma.chessClubs.update({
              where: { id: d.club_id.toString() },
              data: {
                name: d.name,
                icon: d.icon,
                url: d.url,
                description: d.description,
                memberCount: d.members_count,
                joinedAt: d.joinedAt,
                lastActivity: d.lastActivity,
                platform: platform,
                platformId: d.platformId,
                userIds: {
                  push: userId,
                },
                admins: d.admin,
              },
            });
          } else {
            // User is already a member, just update the club details
            return prisma.chessClubs.update({
              where: { id: d.club_id.toString() },
              data: {
                name: d.name,
                icon: d.icon,
                url: d.url,
                description: d.description,
                memberCount: d.members_count,
                joinedAt: d.joinedAt,
                lastActivity: d.lastActivity,
                platform: platform,
                platformId: d.platformId,
                admins: d.admin,
              },
            });
          }
        } else {
          // Club doesn't exist, create it with the user as the first member
          return prisma.chessClubs.create({
            data: {
              id: d.club_id.toString(),
              name: d.name,
              icon: d.icon,
              url: d.url,
              description: d.description,
              memberCount: d.members_count,
              joinedAt: d.joinedAt,
              lastActivity: d.lastActivity,
              platform: platform,
              platformId: d.platformId,
              userIds: [userId],
              admins: d.admin,
            },
          });
        }
      })
    );

    return results;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(e.message);
      return e.message;
    } else if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error(e.message);
      return e.message;
    } else {
      console.error("Unexpected error:", e);
      return "Unexpected error occurred";
    }
  }
};

export const getUserClubs = async (userId: string) => {
  "use cache";
  cacheTag("club-data");
  try {
    const clubs = prisma.chessClubs.findMany({
      where: {
        userIds: {
          has: userId,
        },
      },
    });
    return clubs;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(e.message);
      return e.message;
    } else if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error(e.message);
      return e.message;
    } else {
      console.error("Unexpected error:", e);
      return "Unexpected error occurred";
    }
  }
};

export const removeUserFromClub = async (userId: string, clubId: string) => {
  try {
    // First get the club to check its current userIds
    const club = await prisma.chessClubs.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return `Club with ID ${clubId} not found`;
    }

    // Filter out the user ID from the userIds array
    const updatedUserIds = club.userIds.filter((id) => id !== userId);

    if (updatedUserIds.length === 0) {
      // If no users left, delete the club
      const deletedClub = await prisma.chessClubs.delete({
        where: { id: clubId },
      });
      return deletedClub;
    } else {
      // Otherwise, update the club with the new userIds array
      const updatedClub = await prisma.chessClubs.update({
        where: { id: clubId },
        data: { userIds: updatedUserIds },
      });
      return updatedClub;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(e.message);
      return e.message;
    } else if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error(e.message);
      return e.message;
    } else {
      console.error("Unexpected error:", e);
      return "Unexpected error occurred";
    }
  }
};

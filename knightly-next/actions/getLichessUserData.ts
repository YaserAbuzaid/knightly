"use server";

import { LichessUserClubsResponse } from "@/lib/user-types";
import { unstable_cacheTag as cacheTag } from "next/cache";
import { removeUserFromClub, getUserClubs, upsertUserClubs } from "./userActions";

export const getUserData = async (token: string) => {
  "use cache";

  cacheTag("lichess-user-data");

  try {
    const res = await fetch("https://lichess.org/api/account", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(errText);
      return `${errText}. Please try again.`;
    }
    const data = await res.json();
    data.platform = "lichess";

    return data;
  } catch (err) {
    return "Something went wrong. Please try again.";
  }
};

// Helper function to retry a fetch operation with exponential backoff
const fetchWithRetry = async (
  url: string,
  options = {},
  retries = 3,
  backoff = 300
) => {
  try {
    const response = await fetch(url, options);
    console.log(response);
    return response;
  } catch (err) {
    if (retries <= 1) throw err;

    // Wait for the backoff period
    await new Promise((resolve) => setTimeout(resolve, backoff));

    // Retry with exponential backoff
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
};

// Default rating to use when API calls fail
const DEFAULT_RATING = 1500;

export const getLichessUserStats = async (username: string) => {
  "use cache";

  cacheTag("lichess-user-stats");

  try {
    // Try to fetch from Lichess API with retries
    const res = await fetchWithRetry(
      `https://lichess.org/api/user/${username}`,
      {},
      3
    );
    // console.log(res)

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Lichess API error for user ${username}:`, errText);

      // Return a fallback object with default rating
      return {
        perfs: {
          rapid: {
            rating: DEFAULT_RATING,
            games: 0,
          },
        },
        username,
        error: `${errText}. Using default rating.`,
      };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`Failed to fetch Lichess stats for ${username}:`, err);

    // Return a fallback object with default rating
    return {
      perfs: {
        rapid: {
          rating: DEFAULT_RATING,
          games: 0,
        },
      },
      username,
      error: "API request failed. Using default rating.",
    };
  }
};

export const getLichessUserClubs = async (
  username: string,
  userId: string = "",
  forceFresh: boolean = false
): Promise<LichessUserClubsResponse | string> => {
  "use cache";

  cacheTag("lichess-user-clubs");

  try {
    // Try to fetch from lichess API with retries
    const response = await fetchWithRetry(
      `https://lichess.org/api/team/of/${username}`,
      {
        // Add cache busting parameter when forcing fresh data
        next: { revalidate: forceFresh ? 0 : 3600 },
      },
      3
    );

    switch (response.status) {
      case 200:
        const responseJson = await response.json();
        let clubs = [];

        // Get current club URLs from lichess API
        const currentClubUrls = responseJson.map(
          (club: any) => club.name
        );

        // If we're forcing a refresh and have a userId, handle club removals
        if (forceFresh && userId) {
          // Get existing clubs from our database
          const existingClubs = await getUserClubs(userId);

          if (Array.isArray(existingClubs)) {
            // Find clubs that exist in our DB but not in the current lichess response
            const clubsToRemove = existingClubs.filter(
              (dbClub) => !currentClubUrls.includes(dbClub.url)
            );

            // Remove user from each club that they have left
            if (clubsToRemove.length > 0) {
              console.log(
                `Removing user from ${clubsToRemove.length} clubs that they have left`
              );
              for (const club of clubsToRemove) {
                await removeUserFromClub(userId, club.id);
              }
            }
          }
        }

        for (const club of responseJson) {
          const clubDetails = {
            club_id: club.id,
            name: club.name,
            icon: "",
            url: club.id,
            descrption: club.description,
            members_count: club.nbMembers,
            platform: "lichess",
            platformId: club.id,
            admin: club.leaders.map((leader: any) => `https://lichess.org/api/user/${leader.id}`),
          };
          clubs.push(clubDetails);
        }

        if (userId) {
          await upsertUserClubs(clubs, userId, "lichess");
        }

        // Calculate expiry date (1 hour from now)
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + 1 * 60 * 60 * 1000); // 1 hour in milliseconds

        // Return both the clubs data and the expiry date
        return {
          clubs: responseJson,
          expiryDate: expiryDate.toISOString(),
        };

      case 301:
        console.error(`lichess API for ${username}: URL has changed`);
        break;

      case 304:
        console.log(`lichess API for ${username}: Cached data still valid`);
        break;

      case 404:
        console.error(`lichess API for ${username}: User not found`);
        break;

      case 410:
        console.error(`lichess API for ${username}: Resource gone`);
        break;

      case 429:
        console.error(`lichess API for ${username}: Rate limited`);
        break;

      default:
        console.error(
          `lichess API for ${username}: Unexpected status ${response.status}`
        );
    }

    // If we get here, something went wrong - return fallback data
    return `API returned status ${response.status}.`;
  } catch (error) {
    console.error(`Failed to fetch lichess stats for ${username}:`, error);

    // Return fallback data
    return "API request failed.";
  }
};

"use server";

import { extractSlug } from "@/helpers/getUserClubs";
import { upsertUserClubs, removeUserFromClub, getUserClubs } from "./userActions";
import { ChessComUserClubsResponse } from "@/lib/user-types";
import { unstable_cacheTag as cacheTag } from "next/cache";

export const getChessComUserData = async (username: string) => {
  "use cache";

  cacheTag("chess.com-user-data");
  try {
    const response = await fetch(
      `https://api.chess.com/pub/player/${username}`
    );

    switch (response.status) {
      case 200:
        return await response.json(); // "enjoy your JSON"

      case 301:
        // have something that automatically reports this
        return "Moved Permanently: The requested URL has changed. Please report this to support.";

      case 304:
        return "Not Modified: Cached data is still valid.";

      case 404:
        return "Not Found: The username does not exist.";

      case 410:
        // have something that automatically reports this
        return "Gone: This resource will never be available. Please report this to support.";

      case 429:
        return "Too Many Requests: You have hit the rate limit. Please try again later.";

      default:
        return `Unexpected Error: Received status code ${response.status}. Please refresh and try again.`;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    return "An error occurred while fetching user data. Please refresh and try again.";
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

export const getChessComUserStats = async (username: string) => {
  "use cache";
  cacheTag("chess.com-user-stats");
  try {
    // Try to fetch from Chess.com API with retries
    const response = await fetchWithRetry(
      `https://api.chess.com/pub/player/${username}/stats`,
      {},
      3
    );

    switch (response.status) {
      case 200:
        return await response.json();

      case 301:
        console.error(`Chess.com API for ${username}: URL has changed`);
        break;

      case 304:
        console.log(`Chess.com API for ${username}: Cached data still valid`);
        break;

      case 404:
        console.error(`Chess.com API for ${username}: User not found`);
        break;

      case 410:
        console.error(`Chess.com API for ${username}: Resource gone`);
        break;

      case 429:
        console.error(`Chess.com API for ${username}: Rate limited`);
        break;

      default:
        console.error(
          `Chess.com API for ${username}: Unexpected status ${response.status}`
        );
    }

    // If we get here, something went wrong - return fallback data
    return {
      chess_rapid: {
        last: {
          rating: DEFAULT_RATING,
          date: new Date().getTime(),
        },
      },
      username,
      error: `API returned status ${response.status}. Using default rating.`,
    };
  } catch (error) {
    console.error(`Failed to fetch Chess.com stats for ${username}:`, error);

    // Return fallback data
    return {
      chess_rapid: {
        last: {
          rating: DEFAULT_RATING,
          date: new Date().getTime(),
        },
      },
      username,
      error: "API request failed. Using default rating.",
    };
  }
};

export const getChessComUserClubs = async (
  username: string,
  userId: string = "",
  forceFresh: boolean = false
): Promise<ChessComUserClubsResponse | string> => {
  "use cache";

  cacheTag("chess.com-user-clubs");

  try {
    // Try to fetch from Chess.com API with retries
    const response = await fetchWithRetry(
      `https://api.chess.com/pub/player/${username}/clubs`,
      {
        // Add cache busting parameter when forcing fresh data
        next: { revalidate: forceFresh ? 0 : 3600 }
      },
      3
    );

    switch (response.status) {
      case 200:
        const responseJson = await response.json();
        let clubs = [];

        // Get current club URLs from Chess.com API
        const currentClubUrls = responseJson.clubs.map((club: any) => extractSlug(club.url));

        // If we're forcing a refresh and have a userId, handle club removals
        if (forceFresh && userId) {
          // Get existing clubs from our database
          const existingClubs = await getUserClubs(userId);

          if (Array.isArray(existingClubs)) {
            // Find clubs that exist in our DB but not in the current Chess.com response
            const clubsToRemove = existingClubs.filter(
              dbClub => !currentClubUrls.includes(extractSlug(dbClub.url))
            );

            // Remove user from each club that they have left
            if (clubsToRemove.length > 0) {
              console.log(`Removing user from ${clubsToRemove.length} clubs that they have left`);
              for (const club of clubsToRemove) {
                await removeUserFromClub(userId, club.id);
              }
            }
          }
        }

        for (const club of responseJson.clubs) {
          const response = await fetchWithRetry(
            `https://api.chess.com/pub/club/${extractSlug(club.url)}`,
            {
              next: { revalidate: forceFresh ? 0 : 3600 }
            },
            3
          );
          const clubDetails = await response.json();
          clubs.push(clubDetails);
        }

        if (userId) {
          await upsertUserClubs(clubs, userId, "chess.com");
        }

        // Calculate expiry date (1 hour from now)
        const expiryDate = new Date();
        expiryDate.setTime(expiryDate.getTime() + 1 * 60 * 60 * 1000); // 1 hour in milliseconds

        // Return both the clubs data and the expiry date
        return {
          clubs: responseJson.clubs,
          expiryDate: expiryDate.toISOString(),
        };

      case 301:
        console.error(`Chess.com API for ${username}: URL has changed`);
        break;

      case 304:
        console.log(`Chess.com API for ${username}: Cached data still valid`);
        break;

      case 404:
        console.error(`Chess.com API for ${username}: User not found`);
        break;

      case 410:
        console.error(`Chess.com API for ${username}: Resource gone`);
        break;

      case 429:
        console.error(`Chess.com API for ${username}: Rate limited`);
        break;

      default:
        console.error(
          `Chess.com API for ${username}: Unexpected status ${response.status}`
        );
    }

    // If we get here, something went wrong - return fallback data
    return `API returned status ${response.status}.`;
  } catch (error) {
    console.error(`Failed to fetch Chess.com stats for ${username}:`, error);

    // Return fallback data
    return "API request failed.";
  }
};

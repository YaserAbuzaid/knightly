export type User =
  | string
  | {
      name: string;
      image: string | null;
      id: string;
      createdAt: Date;
      updatedAt: Date;
      email: string;
      emailVerified: boolean;
      chessUsername: string | null;
      chessPlatform: string | null;
      flagCode?: string;
      clubs?: userClub[];
    };

export type ChessComUserData = {
  "@id": string; // Self-referencing profile URL
  url: string; // Chess.com profile page URL
  username: string; // Username of the player
  player_id: number; // Non-changing Chess.com player ID
  title?: string; // Optional chess title (e.g., GM, IM)
  status:
    | "closed"
    | "closed:fair_play_violations"
    | "basic"
    | "premium"
    | "mod"
    | "staff"; // Account status
  name?: string; // Optional full name
  avatar?: string; // Optional avatar URL
  country: string; // API URL for country profile
  joined: number; // Timestamp of when they joined Chess.com
  last_online: number; // Timestamp of last online status
  followers: number; // Number of followers
  is_streamer: boolean; // Whether they are a Chess.com streamer
  twitch_url?: string; // Optional Twitch profile URL
  fide?: number; // Optional FIDE rating
  flagCode: string;
};

//   type for data from lichess to update user
export type updateUserData = {
  name?: string;
  username: string;
  platform: string;
  title?: string;
  image?: string;
};

// you have no idea how much i keep being distracted as i code this... it's 9pm
// feel like i dont know what im doing
export type userClub = {
  id: string;
  name: string;
  url: string | null;
  platform: string;
  icon: string;
};

export type ChessComUserClubsResponse = {
  clubs: userClub[];
  expiryDate: string;
};

export type LichessUserClubsResponse = {
  clubs: userClub[];
  expiryDate: string;
};

export type clubData = {
  club_id: string;
  name: string;
  icon: string | null;
  url: string | null;
  description: string | null;
  members_count: number | null;
  joinedAt: Date | null;
  lastActivity: Date | null;
  platform: string;
  platformId: string;
  admin: string[];
};

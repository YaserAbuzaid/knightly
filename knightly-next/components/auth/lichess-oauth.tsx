"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

function generateRandomString(length: number): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export default function LichessOauth() {
  const router = useRouter();

  async function handleLogin() {
    const codeVerifier = generateRandomString(128);
    const state = generateRandomString(16);
    // Save these locally (for production, consider more secure storage)
    localStorage.setItem("code_verifier", codeVerifier);
    localStorage.setItem("oauth_state", state);

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(hashed);

    const clientId = process.env.NEXT_PUBLIC_LICHESS_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_LICHESS_REDIRECT_URI!; // e.g. http://localhost:3000/callback
    const scope = "challenge:read"; // adjust scopes as needed

    const authUrl = `https://lichess.org/oauth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code_challenge_method=S256&code_challenge=${codeChallenge}&state=${state}&scope=${encodeURIComponent(
      scope
    )}`;

    // Redirect to Lichess OAuth endpoint
    router.push(authUrl);
  }

  return (
    <Button
      onClick={handleLogin}
      className="hover:cursor-pointer bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80"
    >
      Lichess
    </Button>
  );
}

"use client";
import { getUserData } from "@/actions/getLichessUserData";
import { updateUser } from "@/actions/userActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useLoggingOutStore } from "@/lib/zustand";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

// Main component that wraps the callback logic in a Suspense boundary
export default function CallbackPageWrapper() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex justify-center items-center">
        <Loader2 size={28} className="animate-spin" />
      </div>
    }>
      <CallbackPage />
    </Suspense>
  );
}

// The actual callback logic moved to a separate component
function CallbackPage() {
  const isLoggingOut = useLoggingOutStore((state) => state.loggingOut);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSuccessful, setIsSuccessful] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const savedState = localStorage.getItem("oauth_state");
    const codeVerifier = localStorage.getItem("code_verifier");

    if (!code || returnedState !== savedState || !codeVerifier) {
      console.error("OAuth state mismatch or missing parameters");
      return;
    }

    setIsSuccessful(true);
    // Exchange the code for an access token
    fetch("/api/lichess/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, codeVerifier }),
    })
      .then((res) => res.json())
      .then(async (data) => {
        const lichessData = await getUserData(data.access_token);

        if (typeof lichessData == "string" || lichessData instanceof String) {
          toast.error(lichessData);
          router.push("/home");
        }
        const res = await updateUser(lichessData);

        if (typeof res == "string" || res instanceof String) {
          toast.error("Connecting Lichess account failed! Please try again");
        }
        router.push("/home");
      })
      .catch((err) => console.error(err));
  }, [searchParams, router]);

  if (isLoggingOut) {
    return (
      <div className="w-full flex justify-center items-center">
        <Loader2 className="animate-spin" size={16} />
      </div>
    );
  }

  if (!isSuccessful) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <Alert variant="destructive" className="md:w-[50%] w-[95%]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Connecting to Lichess account failed.{" "}
            <Link
              href="/home"
              className="text-blue-500 hover:underline"
            >
              Go back home
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex justify-center items-center">
      <Loader2 size={28} className="animate-spin" />
    </div>
  );
}

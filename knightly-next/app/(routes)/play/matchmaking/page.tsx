"use client";

import React, { useState, useEffect } from "react";
import { TimeControlsSection } from "@/components/navigation/timeControlSection";
import MatchmakingQueue from "@/components/chess/matchmakingQueue";
import { initializeSocket } from "@/services/socketService";
import { Separator } from "@/components/ui/separator";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MatchmakingPage() {
  const [currentMode, setCurrentMode] = useState("5|2 (Blitz)");
  const [showMoreControls, setShowMoreControls] = useState(false);

  // Initialize socket connection when the page loads
  useEffect(() => {
    initializeSocket();
  }, []);

  return (
    <div className="w-full h-full flex flex-col md:flex-row">
      <div className="w-full md:w-1/3 p-4 border-r">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Clock className="h-6 w-6 text-green-500 mr-2" />
          Time Controls
        </h2>
        <p className="text-muted-foreground mb-4">
          Select a time control for your match
        </p>
        <Separator className="my-4" />
        <TimeControlsSection
          currentMode={currentMode}
          setCurrentMode={setCurrentMode}
          showMoreControls={showMoreControls}
          setShowMoreControls={setShowMoreControls}
        />
      </div>

      <div className="w-full md:w-2/3 p-4">
        <h2 className="text-2xl font-bold mb-4">Find a Match</h2>
        <p className="text-muted-foreground mb-6">
          Join the matchmaking queue to find an opponent with a similar rating
        </p>
        <MatchmakingQueue />

        <Card className="mt-8 p-4 rounded-lg">
          <CardHeader>
            <h3 className="text-lg font-medium">How Matchmaking Works</h3>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                You'll be matched with players of similar rating (±400 ELO)
              </li>
              <li>Both players must accept the match before it begins</li>
              <li>The system will try to balance white/black assignments</li>
              <li>
                Time controls are matched exactly - you'll only play against
                others who selected the same time control
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { useMatchmakingStore } from "@/stores/matchmakingStore";
import { TimeControl } from "@/lib/chess-types";

interface TimeControlsSectionProps {
  currentMode: string;
  setCurrentMode: React.Dispatch<React.SetStateAction<string>>;
  showMoreControls: boolean;
  setShowMoreControls: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TimeControlsSection({
  currentMode,
  setCurrentMode,
  showMoreControls,
  setShowMoreControls,
}: TimeControlsSectionProps) {
  const { setTimeControl } = useMatchmakingStore();

  const handleTimeControlSelect = (
    baseTime: number,
    increment: number,
    label: string
  ) => {
    setCurrentMode(label);
    setTimeControl({ baseTime, increment });
  };

  return (
    <>
      <TimeControlSection
        icon={<Clock className="h-5 w-5 text-green-500" />}
        title="Recent"
        options={[
          {
            label: "15 | 10",
            onClick: () =>
              handleTimeControlSelect(15 * 60, 10, "15|10 (Rapid)"),
            active: currentMode === "15|10 (Rapid)",
          },
          {
            label: "5 min",
            onClick: () => handleTimeControlSelect(5 * 60, 0, "5 min (Blitz)"),
            active: currentMode === "5 min (Blitz)",
          },
          {
            label: "5 | 2",
            onClick: () => handleTimeControlSelect(5 * 60, 2, "5|2 (Blitz)"),
            active: currentMode === "5|2 (Blitz)",
          },
        ]}
        rightElement={null}
      />

      <TimeControlSection
        icon={null}
        title="Bullet"
        options={[
          {
            label: "1 min",
            onClick: () => handleTimeControlSelect(60, 0, "1 min (Bullet)"),
            active: currentMode === "1 min (Bullet)",
          },
          {
            label: "1 | 1",
            onClick: () => handleTimeControlSelect(60, 1, "1|1 (Bullet)"),
            active: currentMode === "1|1 (Bullet)",
          },
          {
            label: "2 | 1",
            onClick: () => handleTimeControlSelect(2 * 60, 1, "2|1 (Bullet)"),
            active: currentMode === "2|1 (Bullet)",
          },
        ]}
      />

      <TimeControlSection
        icon={null}
        title="Blitz"
        options={[
          {
            label: "3 min",
            onClick: () => handleTimeControlSelect(3 * 60, 0, "3 min (Blitz)"),
            active: currentMode === "3 min (Blitz)",
          },
          {
            label: "3 | 2",
            onClick: () => handleTimeControlSelect(3 * 60, 2, "3|2 (Blitz)"),
            active: currentMode === "3|2 (Blitz)",
          },
          {
            label: "5 min",
            onClick: () => handleTimeControlSelect(5 * 60, 0, "5 min (Blitz)"),
            active: currentMode === "5 min (Blitz)",
          },
        ]}
      />

      <TimeControlSection
        icon={null}
        title="Rapid"
        options={[
          {
            label: "10 min",
            onClick: () =>
              handleTimeControlSelect(10 * 60, 0, "10 min (Rapid)"),
            active: currentMode === "10 min (Rapid)",
          },
          {
            label: "15 | 10",
            onClick: () =>
              handleTimeControlSelect(15 * 60, 10, "15|10 (Rapid)"),
            active: currentMode === "15|10 (Rapid)",
          },
          {
            label: "30 min",
            onClick: () =>
              handleTimeControlSelect(30 * 60, 0, "30 min (Rapid)"),
            active: currentMode === "30 min (Rapid)",
          },
        ]}
      />

      {showMoreControls && (
        <>
          <TimeControlSection
            icon={null}
            title="Classical"
            options={[
              {
                label: "30 | 20",
                onClick: () =>
                  handleTimeControlSelect(30 * 60, 20, "30|20 (Classical)"),
                active: currentMode === "30|20 (Classical)",
              },
              {
                label: "60 min",
                onClick: () =>
                  handleTimeControlSelect(60 * 60, 0, "60 min (Classical)"),
                active: currentMode === "60 min (Classical)",
              },
              {
                label: "90 | 30",
                onClick: () =>
                  handleTimeControlSelect(90 * 60, 30, "90|30 (Classical)"),
                active: currentMode === "90|30 (Classical)",
              },
            ]}
          />

          <TimeControlSection
            icon={null}
            title="Daily"
            options={[
              {
                label: "1 day",
                onClick: () =>
                  handleTimeControlSelect(24 * 60 * 60, 0, "1 day (Daily)"),
                active: currentMode === "1 day (Daily)",
              },
              {
                label: "3 days",
                onClick: () =>
                  handleTimeControlSelect(
                    3 * 24 * 60 * 60,
                    0,
                    "3 days (Daily)"
                  ),
                active: currentMode === "3 days (Daily)",
              },
              {
                label: "7 days",
                onClick: () =>
                  handleTimeControlSelect(
                    7 * 24 * 60 * 60,
                    0,
                    "7 days (Daily)"
                  ),
                active: currentMode === "7 days (Daily)",
              },
            ]}
          />
        </>
      )}

      <Button
        variant="ghost"
        className="w-full text-zinc-400 flex items-center justify-center mt-2 mb-4"
        onClick={() => setShowMoreControls(!showMoreControls)}
      >
        {showMoreControls ? "Less" : "More"} Time Controls{" "}
        {showMoreControls ? (
          <ChevronUp className="ml-2 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    </>
  );
}

export function TimeControlSection({
  icon,
  title,
  options,
  rightElement,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  options: { label: string; onClick: () => void; active?: boolean }[];
  rightElement?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {icon}
          <span className="ml-2 font-medium">{title}</span>
          {badge && <span className="ml-2">{badge}</span>}
        </div>
        {rightElement && rightElement}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option, index) => (
          <Button
            key={index}
            variant="ghost"
            className={cn(
              "border-1 border-green-500 h-10 cursor-pointer",
              option.active && "border-3 border-green-500"
            )}
            onClick={option.onClick}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

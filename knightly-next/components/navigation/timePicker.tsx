import { Calendar, ChevronDown, ChevronUp, Clock, Pin, Zap } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { TimeControlSection } from "./timeControlSection";

function TimePicker() {
  const [currentMode, setCurrentMode] = React.useState("5|2 (Blitz)");
  const [showMoreControls, setShowMoreControls] = React.useState(false);
  const [showTimeControls, setShowTimeControls] = React.useState(true);
  return (
    <>
      <Button
        onClick={() => setShowTimeControls(!showTimeControls)}
        className="w-[90%] bg-zinc-800 rounded-md p-2 mb-4 flex justify-between items-center cursor-pointer hover:bg-zinc-700"
      >
        <div className="flex items-center">
          {/* <Zap className="h-5 w-5 text-yellow-400 mr-2" /> */}
          <span className="font-medium text-white">{currentMode}</span>
        </div>
        {showTimeControls ? (
          <ChevronUp className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        )}
      </Button>

      {showTimeControls && (
        <>
          {/* <TimeControlSection
            icon={null}
            title="Recent"
            options={[
              {
                label: "15 | 10",
                onClick: () => setCurrentMode("15|10 (Rapid)"),
              },
              {
                label: "5 min",
                onClick: () => setCurrentMode("5 min (Blitz)"),
              },
              {
                label: "5 | 2",
                onClick: () => setCurrentMode("5|2 (Blitz)"),
                active: true,
              },
            ]}
            rightElement={null}
          /> */}

          <TimeControlSection
            icon={null}
            title="Bullet"
            options={[
              {
                label: "1 min",
                onClick: () => setCurrentMode("1 min (Bullet)"),
              },
              { label: "1 | 1", onClick: () => setCurrentMode("1|1 (Bullet)") },
              { label: "2 | 1", onClick: () => setCurrentMode("2|1 (Bullet)") },
            ]}
          />

          <TimeControlSection
            icon={null}
            title="Blitz"
            options={[
              {
                label: "3 min",
                onClick: () => setCurrentMode("3 min (Blitz)"),
              },
              { label: "3 | 2", onClick: () => setCurrentMode("3|2 (Blitz)") },
              {
                label: "5 min",
                onClick: () => setCurrentMode("5 min (Blitz)"),
              },
            ]}
          />

          <TimeControlSection
            icon={null}
            title="Rapid"
            options={[
              {
                label: "10 min",
                onClick: () => setCurrentMode("10 min (Rapid)"),
              },
              {
                label: "15 | 10",
                onClick: () => setCurrentMode("15|10 (Rapid)"),
              },
              {
                label: "30 min",
                onClick: () => setCurrentMode("30 min (Rapid)"),
              },
            ]}
          />
        </>
      )}
    </>
  );
}

export default TimePicker;

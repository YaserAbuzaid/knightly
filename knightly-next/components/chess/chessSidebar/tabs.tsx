import TimePicker from "@/components/navigation/timePicker";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SquarePlus, UsersRound } from "lucide-react";
import Link from "next/link";

function ChessTabs() {
  return (
    <Tabs defaultValue="tab-1" className="h-full">
      <TabsList className="relative h-auto w-full bg-transparent p-0 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border">
        <TabsTrigger
          value="tab-1"
          className="w-full flex flex-col items-center overflow-hidden rounded-t-none rounded-b-none py-2 data-[state=active]:z-10 data-[state=active]:shadow-none"
        >
          <SquarePlus size={18} />
          New Game
        </TabsTrigger>
        <TabsTrigger
          value="tab-2"
          className="w-full flex flex-col items-center overflow-hidden rounded-t-none rounded-b-none py-2 data-[state=active]:z-10 data-[state=active]:shadow-none"
        >
          <UsersRound size={18} />
          Players
        </TabsTrigger>
      </TabsList>
      <TabsContent value="tab-1" className="h-full flex flex-col items-center">
        <TimePicker />
        <Link href="/play/live/1234" className="w-[90%]">
          <Button variant="secondary" className="w-full hover:cursor-pointer">
            New Game
          </Button>
        </Link>
      </TabsContent>
      <TabsContent value="tab-2">
        <p className="p-4 text-center text-xs text-muted-foreground">
          Content for Tab 2
        </p>
      </TabsContent>
    </Tabs>
  );
}

export { ChessTabs };

"use client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getChessComUserData } from "@/actions/getChessComUserData";
import { useState } from "react";
import { ChessComUserData } from "@/lib/user-types";
import { SidebarMenuButton } from "../ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { updateUser } from "@/actions/userActions";
import { platform } from "os";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  username: z.string().min(1),
});

export default function UsernameForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "" },
  });
  const [chessComUserData, setChessComUserData] = useState<ChessComUserData>();
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const data = await getChessComUserData(values.username);

      if (typeof data === "string" || data instanceof String) {
        toast.error(data);
        setIsLoading(false);
        return;
      }
      if (data.avatar) {
        if (data.avatar.length === 0) {
          data.avatar = null;
        }
      }

      const res = await fetch(data.country);
      const flagData = await res.json();
      const flagCode = flagData.code;
      data.flagCode = flagCode;

      setChessComUserData(data);
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to submit the form. Please try again.");
    }
    setIsLoading(false);
  }

  const handleConfirm = async () => {
    setIsLoading(true);
    const data = {
      name: chessComUserData.name,
      username: chessComUserData.username,
      platform: "chess.com",
      title: chessComUserData.title,
      image: chessComUserData.avatar,
    };

    const updatedUser = await updateUser(data);
    if (typeof updatedUser == "string" || updatedUser instanceof String) {
      setIsLoading(false);
      toast.error(updatedUser);
      return;
    }
    window.location.reload()

    return;
  };

  return (
    <div className="flex flex-col w-full h-full">
      {!chessComUserData ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 max-w-3xl mx-auto py-10"
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Chess.com username"
                      type="text"
                      {...field}
                      className="text-black focus:ring-2 focus:ring-green-500 focus:border-green-500 caret-green-500"
                    />
                  </FormControl>
                  <FormDescription>
                    This should be your Chess.com username.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 hover:cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="flex w-full justify-between items-center">
          <div className="flex gap-2 ">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={chessComUserData.avatar}
                alt={chessComUserData.username}
              />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight text-black">
              <span className="truncate font-medium">
                {chessComUserData.username}
              </span>
              <img
                width={20}
                height={20}
                src={`https://flagcdn.com/48x36/${chessComUserData.flagCode.toLowerCase()}.png`}
                alt={chessComUserData.flagCode}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-green-300 hover:bg-green-400 hover:cursor-pointer"
              onClick={() => {
                setChessComUserData(undefined);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600 hover:cursor-pointer"
              onClick={() => {
                handleConfirm();
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { create } from "zustand";

type loggingOutState = {
  loggingOut: boolean;
};

type loggingOutAction = {
  setLoggingOut: (loggingOut: loggingOutState["loggingOut"]) => void;
};

type refreshUserChessDataState = {
  refreshUserChessData: boolean;
};

type refreshUserChessDataAction = {
  setRefreshUserChessData: (refreshUserChessData: refreshUserChessDataState["refreshUserChessData"]) => void;
};

export const useLoggingOutStore = create<loggingOutState & loggingOutAction>((set) => ({
  loggingOut: false,
  setLoggingOut: (loggingOut) => set(() => ({ loggingOut: loggingOut })),
}));

// i dont know how to name!!
export const useRefreshUserChessDataStore = create<refreshUserChessDataState & refreshUserChessDataAction>((set) => ({
  refreshUserChessData: false,
  setRefreshUserChessData: (refreshUserChessData) => set(() => ({ refreshUserChessData: refreshUserChessData })),
}));
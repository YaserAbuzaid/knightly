"use server"

import { revalidateTag } from "next/cache";

export default async function invalidateCache(cacheName: string) {
    console.log(`Invalidating cache tag: ${cacheName}`);
    revalidateTag(cacheName);
    return true;
}

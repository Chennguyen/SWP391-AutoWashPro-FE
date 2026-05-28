"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("autowash-auth", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("autowash-auth", onStoreChange);
  };
}

function normalizeToken(value: string) {
  return value
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "");
}

function getSnapshot() {
  if (typeof window === "undefined") return null;
  return normalizeToken(window.localStorage.getItem("token") ?? "") || null;
}

function getServerSnapshot() {
  return null;
}

export function useAdminToken() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) ?? "";
}

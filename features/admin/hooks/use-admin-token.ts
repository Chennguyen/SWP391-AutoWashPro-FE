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

/**
 * Thành phần (Component) useAdminToken
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function useAdminToken() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) ?? "";
}

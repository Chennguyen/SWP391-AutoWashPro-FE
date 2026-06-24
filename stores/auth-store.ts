"use client";

import { create } from "zustand";

interface AuthState {
  token: string | null;
  role: string | null;
  userId: string | null;
  email: string | null;
  isUnverified: boolean;
  initialized: boolean;
  setAuthData: (data: {
    token: string;
    role?: string;
    userId?: string;
    email?: string;
    isUnverified?: boolean;
  }) => void;
  clearAuthData: () => void;
  setIsUnverified: (value: boolean) => void;
  initialize: () => void;
}

const getSafeStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const setSafeStorageItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage issues
  }
};

const removeSafeStorageItem = (key: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage issues
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  userId: null,
  email: null,
  isUnverified: false,
  initialized: false,

  setAuthData: (data) => {
    setSafeStorageItem("token", data.token);
    if (data.role) setSafeStorageItem("role", data.role);
    if (data.userId) setSafeStorageItem("userId", data.userId);
    if (data.email) setSafeStorageItem("email", data.email);
    if (data.isUnverified !== undefined) {
      setSafeStorageItem("is_unverified", String(data.isUnverified));
    }

    set({
      token: data.token,
      role: data.role || null,
      userId: data.userId || null,
      email: data.email || null,
      isUnverified: data.isUnverified ?? false,
    });

    // Phát sự kiện để đồng bộ với các phần code cũ nếu có
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("autowash-auth"));
    }
  },

  clearAuthData: () => {
    removeSafeStorageItem("token");
    removeSafeStorageItem("role");
    removeSafeStorageItem("userId");
    removeSafeStorageItem("email");
    removeSafeStorageItem("is_unverified");

    set({
      token: null,
      role: null,
      userId: null,
      email: null,
      isUnverified: false,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("autowash-auth"));
    }
  },

  setIsUnverified: (value) => {
    if (value) {
      setSafeStorageItem("is_unverified", "true");
    } else {
      removeSafeStorageItem("is_unverified");
    }
    set({ isUnverified: value });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("autowash-auth"));
    }
  },

  initialize: () => {
    if (typeof window === "undefined") return;
    
    const token = getSafeStorageItem("token");
    const role = getSafeStorageItem("role");
    const userId = getSafeStorageItem("userId");
    const email = getSafeStorageItem("email");
    const isUnverified = getSafeStorageItem("is_unverified") === "true";

    set({
      token,
      role,
      userId,
      email,
      isUnverified,
      initialized: true,
    });
  },
}));

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { loginUser } from "../services";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/lib/api-error";
import { JwtPayload, LoginResult } from "../types/auth-types";
import { LoginFields } from "../validation/auth-validation";

function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json = decodeURIComponent(
      window
        .atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function getRole(payload: JwtPayload | null): string {
  return (
    payload?.Role ??
    payload?.role ??
    payload?.[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ] ??
    ""
  );
}

export function useLogin() {
  const router = useRouter();
  const setAuthData = useAuthStore((state) => state.setAuthData);

  return useMutation<LoginResult, ApiError, LoginFields>({
    mutationFn: async (data) => {
      return await loginUser(data.email, data.password);
    },
    onSuccess: (result) => {
      const token =
        result.data?.access_token ??
        result.data?.Access_token ??
        result.data?.accessToken;

      if (!token) {
        throw new Error("Không nhận được token đăng nhập.");
      }

      const payload = decodeJwtPayload(token);
      const role = getRole(payload);
      const userId =
        payload?.sub ??
        payload?.nameid ??
        payload?.[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
      const emailAddress =
        payload?.email ??
        payload?.[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
        ];

      // Store in Zustand
      setAuthData({
        token,
        role,
        userId,
        email: emailAddress,
      });

      router.refresh();

      if (role.toLowerCase() === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/customer");
      }
    },
  });
}

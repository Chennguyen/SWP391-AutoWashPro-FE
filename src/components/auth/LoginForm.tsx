"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthInput } from "@/components/auth/AuthInput";
import { ApiError } from "@/lib/api/api-error";
import { loginUser } from "@/lib/api/auth";

type LoginErrors = {
  email?: string;
  password?: string;
  global?: string;
};

type JwtPayload = {
  Role?: string;
  role?: string;
  email?: string;
  sub?: string;
  nameid?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"?: string;
};

function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};

  if (!email.trim()) {
    errors.email = "Vui lòng nhập email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Email không hợp lệ.";
  }

  if (!password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  } else if (password.length < 6) {
    errors.password = "Mật khẩu phải từ 6 ký tự.";
  }

  return errors;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }

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

function getRole(payload: JwtPayload | null) {
  return (
    payload?.Role ??
    payload?.role ??
    payload?.[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ] ??
    ""
  );
}

function persistAuthSession(token: string, payload: JwtPayload | null) {
  const role = getRole(payload);
  const userId =
    payload?.sub ??
    payload?.nameid ??
    payload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ];
  const email =
    payload?.email ??
    payload?.[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    ];

  localStorage.setItem("token", token);
  if (role) {
    localStorage.setItem("role", role);
  }
  if (userId) {
    localStorage.setItem("userId", userId);
  }
  if (email) {
    localStorage.setItem("email", email);
  }
  window.dispatchEvent(new Event("autowash-auth"));

  return role;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateLogin(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const result = await loginUser(email, password);
      const token =
        result.data?.access_token ??
        result.data?.Access_token ??
        result.data?.accessToken;

      if (!token) {
        setErrors({ global: "Không nhận được token đăng nhập." });
        return;
      }

      const payload = decodeJwtPayload(token);
      const role = persistAuthSession(token, payload);

      if (role.toLowerCase() === "admin") {
        router.replace("/admin");
        return;
      }

      router.replace("/customer");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setErrors({ email: " ", password: error.message });
          return;
        }

        setErrors({ global: error.message });
        return;
      }

      setErrors({
        global: "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {justRegistered ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span>Đăng ký thành công! Đăng nhập để tiếp tục.</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthInput
          id="login-email"
          label="Email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email) {
              setErrors((current) => ({ ...current, email: undefined }));
            }
          }}
          error={errors.email?.trim() ? errors.email : undefined}
        />

        <AuthInput
          id="login-password"
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (errors.password) {
              setErrors((current) => ({ ...current, password: undefined }));
            }
          }}
          error={errors.password}
          rightLabel={
            <Link href="#" className="hover:underline">
              Quên mật khẩu?
            </Link>
          }
        />

        {errors.global ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <span>{errors.global}</span>
          </div>
        ) : null}

        <button
          id="login-submit-btn"
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-xl bg-[#2563EB] px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-[#1D4ED8] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8v8H4z"
                />
              </svg>
              Đang đăng nhập...
            </span>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>
    </>
  );
}

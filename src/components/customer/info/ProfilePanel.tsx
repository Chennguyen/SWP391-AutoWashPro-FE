"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, Phone, RefreshCw, User } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getCustomerProfile, type CustomerProfile } from "@/lib/api/customer";

interface ProfilePanelProps {
  token: string;
  onUnauthorized: () => void;
}

export function ProfilePanel({ token, onUnauthorized }: ProfilePanelProps) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const data = await getCustomerProfile(token);
      setProfile(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : "Không thể tải thông tin cá nhân.",
      );
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    // ⚡ FIX: Clear stale data immediately when token changes
    setProfile(null);
    setLoadError(null);

    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProfile, token]);

  return (
    <section aria-label="Thông tin cá nhân" className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Thông tin cá nhân
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Xem hồ sơ tài khoản của bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={loadProfile}
          disabled={loading}
          title="Tải lại thông tin cá nhân"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
            aria-hidden
          />
          <span className="sr-only">Tải lại thông tin cá nhân</span>
        </button>
      </div>

      {loading && !profile ? (
        <div className="flex min-h-40 items-center justify-center text-sm text-slate-500">
          <RefreshCw
            size={20}
            className="mr-2 animate-spin text-slate-400"
            aria-hidden
          />
          Đang tải thông tin...
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </div>
      ) : null}

      {profile ? (
        <div className="max-w-2xl space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100/80">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-950">
              <User size={18} className="text-blue-600" aria-hidden />
              Hồ sơ tài khoản
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Thông tin chi tiết được liên kết với tài khoản của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-455 block">
                Tên đệm / tên
              </span>
              <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center">
                {profile.firstName || "---"}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-455 block">
                Họ / tên chính
              </span>
              <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center">
                {profile.lastName || "---"}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-455 block">
                Số CCCD
              </span>
              <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center">
                {profile.cccd || "Chưa cập nhật"}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-455 block flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" /> Email
              </span>
              <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center overflow-x-auto whitespace-nowrap">
                {profile.email || "---"}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-455 block flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" /> Số điện thoại
              </span>
              <div className="text-sm font-semibold text-slate-800 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-sm min-h-[46px] flex items-center">
                {profile.phone || "---"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

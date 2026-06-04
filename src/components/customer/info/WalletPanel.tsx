"use client";

import { FormEvent, useState } from "react";
import { Plus, RefreshCw, WalletCards } from "lucide-react";
import { topUpWallet, type Wallet } from "@/lib/api/wallet";
import { ApiError } from "@/lib/api/api-error";

interface WalletPanelProps {
  token: string;
  wallet: Wallet | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onUnauthorized: () => void;
}

const TOP_UP_PRESETS = [100000, 200000, 500000];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Thành phần (Component) WalletPanel
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function WalletPanel({
  token,
  wallet,
  loading,
  error,
  onRefresh,
  onUnauthorized,
}: WalletPanelProps) {
  const [amount, setAmount] = useState(500000);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopUpError(null);

    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError("Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    setSaving(true);
    try {
      await topUpWallet(token, amount);
      await onRefresh();
    } catch (topUpException) {
      if (topUpException instanceof ApiError && topUpException.status === 401) {
        onUnauthorized();
        return;
      }

      setTopUpError(
        topUpException instanceof Error
          ? topUpException.message
          : "Không thể nạp ví, vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Thông tin ví" className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Thông tin ví</h2>
          <p className="mt-1 text-sm text-slate-500">Xem số dư và nạp tiền vào ví AutoWash Pro.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Tải lại thông tin ví"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
          <span className="sr-only">Tải lại thông tin ví</span>
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white/70">Số dư hiện tại</span>
            <WalletCards size={22} className="text-blue-300" aria-hidden />
          </div>
          {loading && !wallet ? (
            <div className="mt-8 h-10 w-40 animate-pulse rounded bg-white/15" />
          ) : (
            <p className="mt-6 text-3xl font-black tracking-normal">
              {formatCurrency(wallet?.balance ?? 0)}
            </p>
          )}
          {wallet?.updatedAt ? (
            <p className="mt-3 text-xs text-white/55">
              Cập nhật: {new Date(wallet.updatedAt).toLocaleString("vi-VN")}
            </p>
          ) : null}
        </div>

        <form onSubmit={handleTopUp} className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-800">Nạp tiền</h3>
          <div className="mt-4">
            <label htmlFor="wallet-top-up" className="mb-1 block text-sm font-medium text-slate-700">
              Số tiền
            </label>
            <input
              id="wallet-top-up"
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              disabled={saving}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOP_UP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {formatCurrency(preset)}
              </button>
            ))}
          </div>

          {topUpError ? (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {topUpError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Plus size={16} aria-hidden />
            {saving ? "Đang nạp..." : "Nạp ví"}
          </button>
        </form>
      </div>
    </section>
  );
}

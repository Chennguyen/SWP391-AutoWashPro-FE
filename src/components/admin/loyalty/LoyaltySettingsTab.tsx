"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import {
  getLoyaltySettings,
  updateLoyaltySettings,
  type LoyaltyPointsConfig,
} from "@/lib/api/loyalty-admin";
import { AdminError } from "@/components/admin/shared/AdminUi";

interface Props {
  token: string;
}

/**
 * Thành phần (Component) LoyaltySettingsTab
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function LoyaltySettingsTab({ token }: Props) {
  const [settings, setSettings] = useState<LoyaltyPointsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [vndPerPointStr, setVndPerPointStr] = useState("10000");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLoyaltySettings(token);
      setSettings(data);
      setVndPerPointStr(String(data.vndPerPoint));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cài đặt.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateLoyaltySettings(token, { vndPerPoint: Number(vndPerPointStr) || 10000 });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu cài đặt.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !settings) {
    return <div className="py-10 text-center text-sm text-slate-500">Đang tải cài đặt...</div>;
  }

  return (
    <div className="max-w-xl">
      {error ? <AdminError message={error} onRetry={load} /> : null}

      <form onSubmit={handleSubmit} className="space-y-5 mt-4">
        {/* Điểm tích lũy */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-950 border-b border-slate-100 pb-2">Tích lũy & Loyalty</h3>
          <div>
            <label htmlFor="vnd-per-point" className="block text-sm font-semibold text-slate-700 mb-1">
              Số VNĐ để tích 1 điểm (VND_per_point)
            </label>
            <input
              id="vnd-per-point"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={vndPerPointStr}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                const cleanVal = val.startsWith("0") && val.length > 1 ? val.replace(/^0+/, "") || "0" : val;
                setVndPerPointStr(cleanVal);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Ví dụ: {(Number(vndPerPointStr) || 0).toLocaleString("vi-VN")} VNĐ = 1 điểm. Khách sẽ tích điểm dựa trên giá trị đơn rửa xe.
            </p>
          </div>
        </div>

        {success && (
          <p className="text-sm font-medium text-emerald-600">✓ Đã lưu cài đặt thành công.</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          Lưu cài đặt
        </button>
      </form>
    </div>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import {
  getLoyaltySettings,
  updateSystemConfig,
  type LoyaltyPointsConfig,
} from "@/features/loyalty/loyalty-admin-service";
import { AdminError } from "@/features/admin/components/admin-ui";

interface Props {
  token: string;
}

/**
 * Thành phần (Component) SlotSettingsTab
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function SlotSettingsTab({ token }: Props) {
  const [settings, setSettings] = useState<LoyaltyPointsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(15);
  const [workingStartHour, setWorkingStartHour] = useState("08:00");
  const [workingEndHour, setWorkingEndHour] = useState("17:00");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLoyaltySettings(token);
      setSettings(data);
      setSlotDurationMinutes(data.slotDurationMinutes ?? 15);
      setWorkingStartHour(data.workingStartHour ?? "08:00");
      setWorkingEndHour(data.workingEndHour ?? "17:00");
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
      await updateSystemConfig(token, "SlotDurationMinutes", String(slotDurationMinutes));
      
      // Chuyển đổi định dạng "08:00" -> "8" và "17:00" -> "17" để Backend parse thành công
      const startHourClean = workingStartHour.split(":")[0].replace(/^0+/, "") || "0";
      const endHourClean = workingEndHour.split(":")[0].replace(/^0+/, "") || "0";
      
      await updateSystemConfig(token, "WorkingStartHour", startHourClean);
      await updateSystemConfig(token, "WorkingEndHour", endHourClean);
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
        {/* Cấu hình Slot đặt lịch */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-950 border-b border-slate-100 pb-2">Cấu hình Đặt lịch (Booking Slots)</h3>
          
          <div>
            <label htmlFor="slot-duration" className="block text-sm font-semibold text-slate-700 mb-1">
              Khoảng cách giữa các slot (phút)
            </label>
            <select
              id="slot-duration"
              value={slotDurationMinutes}
              onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value={15}>15 phút (Mặc định)</option>
              <option value={30}>30 phút</option>
              <option value={45}>45 phút</option>
              <option value={60}>60 phút (1 tiếng)</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Xác định độ dài mỗi ca rửa xe. Hệ thống tự động chia các slot trống cách nhau thời lượng này.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="working-start" className="block text-sm font-semibold text-slate-700 mb-1">
                Giờ bắt đầu làm việc
              </label>
              <select
                id="working-start"
                value={workingStartHour}
                onChange={(e) => setWorkingStartHour(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const val = `${String(i).padStart(2, "0")}:00`;
                  return (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label htmlFor="working-end" className="block text-sm font-semibold text-slate-700 mb-1">
                Giờ kết thúc làm việc
              </label>
              <select
                id="working-end"
                value={workingEndHour}
                onChange={(e) => setWorkingEndHour(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const val = `${String(i).padStart(2, "0")}:00`;
                  return (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Giờ làm việc giới hạn ở các mốc giờ chẵn để tương thích hoàn hảo với bộ phân tích giờ của Backend.
          </p>
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

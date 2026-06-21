"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import {
  getLoyaltySettings,
  updateSystemConfig,
  type LoyaltyPointsConfig,
} from "@/lib/api/loyalty-admin";
import { AdminError } from "@/components/admin/shared/AdminUi";

interface Props {
  token: string;
}

/**
 * Thành phần (Component) PricingSettingsTab
 * 
 * Chức năng: Cho phép Admin quản lý các cấu hình liên quan đến Giá dịch vụ cơ bản,
 * phụ phí xe Sedan/SUV và tỷ lệ đặt cọc của khách hàng.
 */
export function PricingSettingsTab({ token }: Props) {
  const [settings, setSettings] = useState<LoyaltyPointsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [basePriceStr, setBasePriceStr] = useState("100000");
  const [sedanBasePriceStr, setSedanBasePriceStr] = useState("0");
  const [suvBasePriceStr, setSuvBasePriceStr] = useState("30000");
  const [paymentDepositeStr, setPaymentDepositeStr] = useState("30");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getLoyaltySettings(token);
      setSettings(data);
      setBasePriceStr(String(data.basePrice ?? 100000));
      setSedanBasePriceStr(String(data.sedanBasePrice ?? 0));
      setSuvBasePriceStr(String(data.suvBasePrice ?? 30000));
      setPaymentDepositeStr(String(data.paymentDeposite ?? 30));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải cấu hình giá.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  // Hàm xử lý chuẩn hóa số nhập vào form
  function handleNumericChange(val: string, setter: (v: string) => void) {
    const clean = val.replace(/[^0-9]/g, "");
    const finalVal = clean.startsWith("0") && clean.length > 1 ? clean.replace(/^0+/, "") || "0" : clean;
    setter(finalVal || "0");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validate tỷ lệ đặt cọc
    const depositPercent = Number(paymentDepositeStr);
    if (depositPercent < 0 || depositPercent > 100) {
      setError("Tỷ lệ đặt cọc phải nằm trong khoảng từ 0% đến 100%.");
      setSaving(false);
      return;
    }

    try {
      // Gọi song song lưu các tham số hệ thống lên Backend
      await Promise.all([
        updateSystemConfig(token, "BasePrice", basePriceStr),
        updateSystemConfig(token, "SedanBasePrice", sedanBasePriceStr),
        updateSystemConfig(token, "SuvBasePrice", suvBasePriceStr),
        updateSystemConfig(token, "PaymentDeposite", paymentDepositeStr),
      ]);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu cài đặt giá.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !settings) {
    return <div className="py-10 text-center text-sm text-slate-500">Đang tải cài đặt giá...</div>;
  }

  return (
    <div className="max-w-xl">
      {error ? <AdminError message={error} onRetry={load} /> : null}

      <form onSubmit={handleSubmit} className="space-y-5 mt-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-950 border-b border-slate-100 pb-2">Bảng giá dịch vụ & Đặt cọc</h3>
          
          {/* Giá cơ bản */}
          <div>
            <label htmlFor="base-price" className="block text-sm font-semibold text-slate-700 mb-1">
              Giá dịch vụ cơ bản (BasePrice - VNĐ)
            </label>
            <input
              id="base-price"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={basePriceStr}
              onChange={(e) => handleNumericChange(e.target.value, setBasePriceStr)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Giá rửa xe cơ bản gốc của hệ thống. Ví dụ: {(Number(basePriceStr) || 0).toLocaleString("vi-VN")} VNĐ.
            </p>
          </div>

          {/* Phụ phí Sedan */}
          <div>
            <label htmlFor="sedan-price" className="block text-sm font-semibold text-slate-700 mb-1">
              Phụ phí xe Sedan (SedanBasePrice - VNĐ)
            </label>
            <input
              id="sedan-price"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={sedanBasePriceStr}
              onChange={(e) => handleNumericChange(e.target.value, setSedanBasePriceStr)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Số tiền cộng thêm cho xe Sedan. Ví dụ: {(Number(sedanBasePriceStr) || 0).toLocaleString("vi-VN")} VNĐ.
            </p>
          </div>

          {/* Phụ phí SUV */}
          <div>
            <label htmlFor="suv-price" className="block text-sm font-semibold text-slate-700 mb-1">
              Phụ phí xe SUV (SuvBasePrice - VNĐ)
            </label>
            <input
              id="suv-price"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={suvBasePriceStr}
              onChange={(e) => handleNumericChange(e.target.value, setSuvBasePriceStr)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Số tiền cộng thêm cho xe SUV. Ví dụ: {(Number(suvBasePriceStr) || 0).toLocaleString("vi-VN")} VNĐ.
            </p>
          </div>

          {/* Tỷ lệ đặt cọc */}
          <div>
            <label htmlFor="deposit-percent" className="block text-sm font-semibold text-slate-700 mb-1">
              Tỷ lệ thanh toán đặt cọc (PaymentDeposite - %)
            </label>
            <input
              id="deposit-percent"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={paymentDepositeStr}
              onChange={(e) => handleNumericChange(e.target.value, setPaymentDepositeStr)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Tỷ lệ đặt cọc trước (từ 0 đến 100%). Ví dụ: {paymentDepositeStr}%.
            </p>
          </div>
        </div>

        {success && (
          <p className="text-sm font-medium text-emerald-600">✓ Đã lưu cấu hình giá thành công.</p>
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

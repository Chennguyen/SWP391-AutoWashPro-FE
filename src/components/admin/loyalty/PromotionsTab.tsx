"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Calendar, Plus, RefreshCw, Save, X } from "lucide-react";
import {
  createAdminPromotion,
  getAdminPromotions,
  type AdminPromotion,
  type CreatePromotionPayload,
} from "@/lib/api/loyalty-admin";
import { AdminError } from "@/components/admin/shared/AdminUi";

interface Props {
  token: string;
}

const DISCOUNT_TYPE_OPTIONS = [
  { value: 0, label: "Giảm theo %" },
  { value: 1, label: "Giảm số tiền cố định (VNĐ)" },
];

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function PromotionStatusBadge({ promotion }: { promotion: AdminPromotion }) {
  const now = Date.now();
  const start = new Date(promotion.startDate).getTime();
  const end = new Date(promotion.endDate).getTime();

  if (now < start) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
        Chưa bắt đầu
      </span>
    );
  }
  if (now > end) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
        Đã kết thúc
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
      Đang chạy
    </span>
  );
}

interface CreatePromotionModalProps {
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

function CreatePromotionModal({ onClose, onSaved, token }: CreatePromotionModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState(1); // default: fixed amount
  const [discountValue, setDiscountValue] = useState(15000);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: CreatePromotionPayload = {
      name,
      description,
      discountType,
      discountValue,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isGlobal,
    };
    try {
      await createAdminPromotion(token, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo chương trình khuyến mãi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Tạo chương trình khuyến mãi</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên chương trình</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Khai Trương Ưu Đãi Hạng Vàng"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Giảm trực tiếp 15k cho thành viên Gold trở lên"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại giảm giá</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {DISCOUNT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Giá trị giảm {discountType === 0 ? "(%)" : "(VNĐ)"}
              </label>
              <input
                type="number"
                min={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày kết thúc</label>
              <input
                type="date"
                required
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is-global"
              type="checkbox"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is-global" className="text-sm font-medium text-slate-700">
              Áp dụng toàn hệ thống (isGlobal)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Tạo chương trình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PromotionsTab({ token }: Props) {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminPromotions(token);
      setPromotions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách khuyến mãi.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={15} />
          Tạo khuyến mãi
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={load} /> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tên chương trình</th>
              <th className="px-4 py-3">Loại giảm</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Phạm vi</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && promotions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  <RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={20} />
                  Đang tải...
                </td>
              </tr>
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Chưa có chương trình khuyến mãi nào.
                </td>
              </tr>
            ) : (
              promotions.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{p.name}</p>
                    {p.description && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{p.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {DISCOUNT_TYPE_OPTIONS.find((o) => o.value === p.discountType)?.label ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">
                    {p.discountType === 0
                      ? `${p.discountValue}%`
                      : `${p.discountValue.toLocaleString("vi-VN")}đ`}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(p.startDate)} – {formatDate(p.endDate)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.isGlobal ? (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">Toàn hệ thống</span>
                    ) : (
                      <span className="rounded bg-slate-50 px-1.5 py-0.5 text-xs text-slate-500">Theo hạng</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PromotionStatusBadge promotion={p} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreatePromotionModal
          token={token}
          onClose={() => setShowCreate(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

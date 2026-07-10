"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Calendar, Plus, RefreshCw, Save, X } from "lucide-react";
import {
  createAdminPromotion,
  getAdminPromotions,
  updateAdminPromotion,
  deleteAdminPromotion,
  getAdminTiers,
  type AdminPromotion,
  type CreatePromotionPayload,
  type AdminTier,
} from "@/features/loyalty/loyalty-admin-service";
import { AdminError } from "@/features/admin/components/admin-ui";

interface Props {
  token: string;
}

const DISCOUNT_TYPE_OPTIONS = [
  { value: "Percentage", label: "Giảm theo %" },
  { value: "FixedAmount", label: "Giảm số tiền cố định (VNĐ)" },
];

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function PromotionStatusBadge({ promotion }: { promotion: AdminPromotion }) {
  if (promotion.isActive === false) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
        Tạm dừng
      </span>
    );
  }

  const now = Date.now();
  const startDateObj = new Date(promotion.startDate);
  startDateObj.setHours(0, 0, 0, 0);
  const start = startDateObj.getTime();

  const endDateObj = new Date(promotion.endDate);
  endDateObj.setHours(23, 59, 59, 999);
  const end = endDateObj.getTime();

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

interface PromotionFormProps {
  initial?: AdminPromotion | null;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

function PromotionFormModal({ initial, readOnly = false, onClose, onSaved, token }: PromotionFormProps) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [discountType, setDiscountType] = useState(initial?.discountType ?? "FixedAmount"); // default: fixed amount
  const [discountValueStr, setDiscountValueStr] = useState(initial ? String(initial.discountValue) : "15000");
  
  const formatDateForInput = (iso: string) => {
    if (!iso) return "";
    return iso.split("T")[0];
  };

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  
  const [startDate, setStartDate] = useState(formatDateForInput(initial?.startDate ?? ""));
  const [endDate, setEndDate] = useState(formatDateForInput(initial?.endDate ?? ""));
  const [isGlobal, setIsGlobal] = useState(initial?.isGlobal ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tiers, setTiers] = useState<AdminTier[]>([]);
  const [selectedTierIds, setSelectedTierIds] = useState<string[]>(initial?.tierIds ?? []);
  const [loadingTiers, setLoadingTiers] = useState(false);

  useEffect(() => {
    async function loadTiers() {
      setLoadingTiers(true);
      try {
        const data = await getAdminTiers(token);
        setTiers(data.sort((a, b) => a.level - b.level));
      } catch (err) {
        console.error("Failed to load tiers:", err);
      } finally {
        setLoadingTiers(false);
      }
    }
    loadTiers();
  }, [token]);

  useEffect(() => {
    if (!initial) {
      if (discountType === "Percentage") {
        setDiscountValueStr("10");
      } else {
        setDiscountValueStr("15000");
      }
    }
  }, [discountType, initial]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) {
      onClose();
      return;
    }
    const discountValue = Number(discountValueStr || 0);
    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }
    if (discountType === "Percentage" && (discountValue < 1 || discountValue > 100)) {
      setError("Giá trị giảm theo % phải nằm trong khoảng từ 1% đến 100%.");
      return;
    }
    if (!isGlobal && selectedTierIds.length === 0) {
      setError("Vui lòng chọn ít nhất một hạng thành viên áp dụng.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tierIdsToSend = isGlobal ? [] : selectedTierIds;
      if (isEdit && initial) {
        await updateAdminPromotion(token, initial.id, {
          name,
          description,
          discountType,
          discountValue,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          isGlobal,
          isActive,
          tierIds: tierIdsToSend,
        });
      } else {
        const payload: CreatePromotionPayload = {
          name,
          description,
          discountType,
          discountValue,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          isGlobal,
          tierIds: tierIdsToSend,
        };
        await createAdminPromotion(token, payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Không thể lưu chương trình khuyến mãi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">
            {readOnly ? "Chi tiết khuyến mãi" : isEdit ? "Sửa chương trình khuyến mãi" : "Tạo chương trình khuyến mãi"}
          </h3>
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
              disabled={readOnly}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Khai Trương Ưu Đãi Hạng Vàng"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
            <textarea
              rows={2}
              disabled={readOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Giảm trực tiếp 15k cho thành viên Gold trở lên"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại giảm giá</label>
              <select
                disabled={readOnly || isEdit}
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              >
                {DISCOUNT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Giá trị giảm {discountType === "Percentage" ? "(%)" : "(VNĐ)"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={readOnly}
                value={discountValueStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  const cleanVal = val.startsWith("0") && val.length > 1 ? val.replace(/^0+/, "") || "0" : val;
                  setDiscountValueStr(cleanVal);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
              <input
                type="date"
                required
                disabled={readOnly}
                min={getTodayString()}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày kết thúc</label>
              <input
                type="date"
                required
                disabled={readOnly}
                value={endDate}
                min={startDate || getTodayString()}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is-global"
              type="checkbox"
              disabled={readOnly}
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
            />
            <label htmlFor="is-global" className="text-sm font-medium text-slate-700">
              Áp dụng toàn hệ thống (isGlobal)
            </label>
          </div>

          {!isGlobal && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2">
              <label className="block text-sm font-semibold text-slate-800">
                Hạng thành viên áp dụng
              </label>
              {loadingTiers ? (
                <p className="text-xs text-slate-400 animate-pulse">Đang tải danh sách hạng...</p>
              ) : tiers.length === 0 ? (
                <p className="text-xs text-slate-400">Không có hạng thành viên nào.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {tiers.map((t) => {
                    const isChecked = selectedTierIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all duration-200 ${
                          isChecked
                            ? "border-blue-500 bg-blue-50/40 text-blue-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTierIds([...selectedTierIds, t.id]);
                            } else {
                              setSelectedTierIds(selectedTierIds.filter((id) => id !== t.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                        />
                        <span className="text-sm font-medium text-xs md:text-sm">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(isEdit || readOnly) && (
            <div className="flex items-center gap-3">
              <input
                id="promo-active"
                type="checkbox"
                disabled={readOnly}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
              />
              <label htmlFor="promo-active" className="text-sm font-medium text-slate-700">
                Kích hoạt (active)
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {readOnly ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
            ) : (
              <>
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
                  {isEdit ? "Cập nhật" : "Tạo chương trình"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Thành phần (Component) PromotionsTab
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function PromotionsTab({ token }: Props) {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"new" | "edit" | "view" | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<AdminPromotion | null>(null);

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

  async function handleDelete(promoId: string, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa chương trình "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteAdminPromotion(token, promoId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa chương trình khuyến mãi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setSelectedPromotion(null);
            setFormMode("new");
          }}
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
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Phạm vi</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && promotions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  <RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={20} />
                  Đang tải...
                </td>
              </tr>
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Chưa có chương trình khuyến mãi nào.
                </td>
              </tr>
            ) : (
              promotions.map((p) => {
                const now = Date.now();
                const endDateObj = new Date(p.endDate);
                endDateObj.setHours(23, 59, 59, 999);
                const hasEnded = now > endDateObj.getTime();

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setSelectedPromotion(p);
                      setFormMode("view");
                    }}
                  >
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
                      {p.discountType === "Percentage"
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
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {!hasEnded && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPromotion(p);
                              setFormMode("edit");
                            }}
                            className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                          >
                            Sửa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name)}
                          className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {formMode !== null && (
        <PromotionFormModal
          initial={formMode === "new" ? null : selectedPromotion}
          readOnly={formMode === "view"}
          token={token}
          onClose={() => {
            setFormMode(null);
            setSelectedPromotion(null);
          }}
          onSaved={load}
        />
      )}
    </div>
  );
}

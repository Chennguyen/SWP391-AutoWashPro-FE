"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Save, X } from "lucide-react";
import {
  createAdminReward,
  getAdminRewards,
  updateAdminReward,
  deleteAdminReward,
  getAdminTiers,
  type AdminReward,
  type AdminRewardTypeEnum,
  type CreateRewardPayload,
  type AdminTier,
  REWARD_TYPE_MAP,
  REWARD_TYPE_REVERSE,
} from "@/features/loyalty/loyalty-admin-service";
import { AdminError } from "@/features/admin/components/admin-ui";

interface Props {
  token: string;
}

const REWARD_TYPE_OPTIONS: { value: AdminRewardTypeEnum; label: string }[] = [
  { value: 0, label: "Rửa xe miễn phí" },
  { value: 1, label: "Voucher giảm giá" },
  { value: 2, label: "Quà tặng" },
];

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
        isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {isActive ? "Hoạt động" : "Ngưng hoạt động"}
    </span>
  );
}

interface RewardFormProps {
  initial?: AdminReward | null;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

function RewardFormModal({ initial, readOnly = false, onClose, onSaved, token }: RewardFormProps) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pointsRequiredStr, setPointsRequiredStr] = useState(initial ? String(initial.pointsRequired) : "500");
  const [rewardTypeEnum, setRewardTypeEnum] = useState<AdminRewardTypeEnum>(
    initial?.rewardTypeEnum ?? 0,
  );
  const [quantityAvailableStr, setQuantityAvailableStr] = useState(
    initial?.quantityAvailable !== undefined && initial?.quantityAvailable !== null
      ? String(initial.quantityAvailable)
      : "100"
  );
  const [validDaysStr, setValidDaysStr] = useState(
    initial?.validDays !== undefined && initial?.validDays !== null
      ? String(initial.validDays)
      : "30"
  );
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
        console.error("Failed to load Tiers:", err);
      } finally {
        setLoadingTiers(false);
      }
    }
    loadTiers();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) {
      onClose();
      return;
    }
    if (selectedTierIds.length === 0) {
      setError("Vui lòng chọn ít nhất một hạng thành viên được phép đổi.");
      return;
    }
    const pointsRequired = Number(pointsRequiredStr || 0);
    const quantityAvailable = Number(quantityAvailableStr || 0);
    const validDays = Number(validDaysStr || 0);

    setSaving(true);
    setError(null);
    try {
      if (isEdit && initial) {
        await updateAdminReward(token, initial.id, {
          name,
          description,
          pointsRequired,
          quantityAvailable: quantityAvailable,
          validDays: validDays,
          isActive,
          tierIds: selectedTierIds,
        });
      } else {
        const payload: CreateRewardPayload = {
          name,
          description,
          pointsRequired,
          rewardType: rewardTypeEnum,   // integer enum
          quantityAvailable: quantityAvailable,
          validDays: validDays,
          isActive,
          tierIds: selectedTierIds,
        };
        await createAdminReward(token, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu phần thưởng.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">
            {readOnly ? "Chi tiết phần thưởng" : isEdit ? "Sửa phần thưởng" : "Thêm phần thưởng mới"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên phần thưởng</label>
            <input
              required
              disabled={readOnly}
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Điểm cần</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={readOnly}
                value={pointsRequiredStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  const cleanVal = val.startsWith("0") && val.length > 1 ? val.replace(/^0+/, "") || "0" : val;
                  setPointsRequiredStr(cleanVal);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng tồn kho</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={readOnly}
                value={quantityAvailableStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  const cleanVal = val.startsWith("0") && val.length > 1 ? val.replace(/^0+/, "") || "0" : val;
                  setQuantityAvailableStr(cleanVal);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại phần thưởng</label>
              <select
                disabled={readOnly}
                value={rewardTypeEnum}
                onChange={(e) => setRewardTypeEnum(Number(e.target.value) as AdminRewardTypeEnum)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              >
                {REWARD_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Hiệu lực sau khi đổi (ngày)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={readOnly}
              value={validDaysStr}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                const cleanVal = val.startsWith("0") && val.length > 1 ? val.replace(/^0+/, "") || "0" : val;
                setValidDaysStr(cleanVal);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2">
            <label className="block text-sm font-semibold text-slate-800">
              Hạng thành viên được đổi
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

          {(isEdit || readOnly) && (
            <div className="flex items-center gap-3">
              <input
                id="reward-active"
                type="checkbox"
                disabled={readOnly}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
              />
              <label htmlFor="reward-active" className="text-sm font-medium text-slate-700">
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
                  {isEdit ? "Cập nhật" : "Thêm mới"}
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
 * Thành phần (Component) RewardsTab
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function RewardsTab({ token }: Props) {
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"new" | "edit" | "view" | null>(null);
  const [selectedReward, setSelectedReward] = useState<AdminReward | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminRewards(token);
      setRewards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách phần thưởng.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function handleDelete(rewardId: string, name: string) {
    if (!confirm(`Bạn có chắc chắn muốn xóa phần thưởng "${name}"?`)) return;
    setLoading(true);
    try {
      await deleteAdminReward(token, rewardId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa phần thưởng.");
    } finally {
      setLoading(false);
    }
  }

  function rewardTypeLabel(r: AdminReward): string {
    return REWARD_TYPE_OPTIONS.find((t) => t.value === r.rewardTypeEnum)?.label
      ?? REWARD_TYPE_MAP[r.rewardTypeEnum]
      ?? r.rewardType;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setSelectedReward(null);
            setFormMode("new");
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={15} />
          Thêm phần thưởng
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={load} /> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tên phần thưởng</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Điểm cần</th>
              <th className="px-4 py-3">Tồn kho</th>
              <th className="px-4 py-3">Hiệu lực</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && rewards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  <RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={20} />
                  Đang tải...
                </td>
              </tr>
            ) : rewards.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Chưa có phần thưởng nào. Thêm mới bên trên.
                </td>
              </tr>
            ) : (
              rewards.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setSelectedReward(r);
                    setFormMode("view");
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{r.name}</p>
                    {r.description && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{r.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{rewardTypeLabel(r)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {r.pointsRequired.toLocaleString("vi-VN")} điểm
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.quantityAvailable ?? "∞"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.validDays ? `${r.validDays} ngày` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isActive={r.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReward(r);
                          setFormMode("edit");
                        }}
                        className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id, r.name)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formMode !== null ? (
        <RewardFormModal
          initial={formMode === "new" ? null : selectedReward}
          readOnly={formMode === "view"}
          token={token}
          onClose={() => {
            setFormMode(null);
            setSelectedReward(null);
          }}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}

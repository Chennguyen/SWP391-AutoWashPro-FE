"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit2, Plus, RefreshCw, Save, X } from "lucide-react";
import {
  createAdminReward,
  getAdminRewards,
  updateAdminReward,
  type AdminReward,
  type AdminRewardTypeEnum,
  type CreateRewardPayload,
  REWARD_TYPE_MAP,
  REWARD_TYPE_REVERSE,
} from "@/lib/api/loyalty-admin";
import { AdminError } from "@/components/admin/shared/AdminUi";

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
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

interface RewardFormProps {
  initial?: AdminReward | null;
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

function RewardFormModal({ initial, onClose, onSaved, token }: RewardFormProps) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pointsRequired, setPointsRequired] = useState(initial?.pointsRequired ?? 500);
  const [rewardTypeEnum, setRewardTypeEnum] = useState<AdminRewardTypeEnum>(
    initial?.rewardTypeEnum ?? 0,
  );
  const [quantityAvailable, setQuantityAvailable] = useState(initial?.quantityAvailable ?? 100);
  const [validDays, setValidDays] = useState(initial?.validDays ?? 30);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && initial) {
        await updateAdminReward(token, initial.id, {
          name,
          description,
          pointsRequired,
          quantityAvailable: quantityAvailable ?? undefined,
          validDays: validDays ?? undefined,
          isActive,
        });
      } else {
        const payload: CreateRewardPayload = {
          name,
          description,
          pointsRequired,
          rewardType: rewardTypeEnum,   // integer enum
          quantityAvailable: quantityAvailable ?? 0,
          validDays: validDays ?? 30,
          isActive,
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
            {isEdit ? "Sửa phần thưởng" : "Thêm phần thưởng mới"}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Điểm cần</label>
              <input
                type="number"
                min={1}
                value={pointsRequired}
                onChange={(e) => setPointsRequired(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng tồn kho</label>
              <input
                type="number"
                min={0}
                value={quantityAvailable ?? 0}
                onChange={(e) => setQuantityAvailable(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại phần thưởng</label>
              <select
                value={rewardTypeEnum}
                onChange={(e) => setRewardTypeEnum(Number(e.target.value) as AdminRewardTypeEnum)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              type="number"
              min={1}
              value={validDays ?? 30}
              onChange={(e) => setValidDays(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <input
                id="reward-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="reward-active" className="text-sm font-medium text-slate-700">
                Kích hoạt (active)
              </label>
            </div>
          )}

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
              {isEdit ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RewardsTab({ token }: Props) {
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<"new" | AdminReward | null>(null);

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
          onClick={() => setFormTarget("new")}
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
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{r.name}</p>
                    {r.description && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{r.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{rewardTypeLabel(r)}</td>
                  <td className="px-4 py-3 font-semibold text-amber-600">
                    {r.pointsRequired.toLocaleString("vi-VN")} điểm
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.quantityAvailable ?? "∞"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.validDays ? `${r.validDays} ngày` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isActive={r.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setFormTarget(r)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      title="Sửa"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formTarget !== null ? (
        <RewardFormModal
          initial={formTarget === "new" ? null : formTarget}
          token={token}
          onClose={() => setFormTarget(null)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}

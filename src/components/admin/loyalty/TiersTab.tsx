"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit2, Plus, RefreshCw, Save, X } from "lucide-react";
import {
  createAdminTier,
  getAdminTiers,
  updateAdminTier,
  type AdminTier,
  type CreateTierPayload,
  type UpdateTierPayload,
} from "@/lib/api/loyalty-admin";
import { AdminError } from "@/components/admin/shared/AdminUi";

interface Props {
  token: string;
}

function TierLevelBadge({ level }: { level: number }) {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
      Cấp {level}
    </span>
  );
}

// ─── Shared Form Fields ───────────────────────────────────────────────────────

interface TierFormFields {
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description: string;
}

interface TierFormProps {
  initial: TierFormFields;
  title: string;
  saving: boolean;
  error: string | null;
  onSubmit: (fields: TierFormFields) => void;
  onClose: () => void;
}

function TierFormModal({ initial, title, saving, error, onSubmit, onClose }: TierFormProps) {
  const [name, setName] = useState(initial.name);
  const [level, setLevel] = useState(initial.level);
  const [requiredWashes, setRequiredWashes] = useState(initial.requiredWashes);
  const [priorityBookingDays, setPriorityBookingDays] = useState(initial.priorityBookingDays);
  const [description, setDescription] = useState(initial.description);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({ name, level, requiredWashes, priorityBookingDays, description });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tên hạng</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Silver, Gold, Platinum"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cấp độ (level)</label>
              <input
                type="number"
                min={1}
                required
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Số lần rửa yêu cầu</label>
              <input
                type="number"
                min={0}
                required
                value={requiredWashes}
                onChange={(e) => setRequiredWashes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-0.5 text-xs text-slate-400">Lần rửa tích lũy để đạt hạng</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Đặt lịch trước tối đa (ngày)
            </label>
            <input
              type="number"
              min={0}
              value={priorityBookingDays}
              onChange={(e) => setPriorityBookingDays(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-0.5 text-xs text-slate-400">0 = không giới hạn. Ví dụ: 7 = chỉ đặt trước tối đa 7 ngày</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả quyền lợi</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Hạng Platinum với các đặc quyền ưu tiên cao cấp nhất"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
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
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ModalMode =
  | { kind: "create" }
  | { kind: "edit"; tier: AdminTier }
  | null;

export function TiersTab({ token }: Props) {
  const [tiers, setTiers] = useState<AdminTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminTiers(token);
      setTiers(data.sort((a, b) => a.level - b.level));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách tier.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  function openCreate() {
    setModal({ kind: "create" });
    setModalError(null);
  }

  function openEdit(tier: AdminTier) {
    setModal({ kind: "edit", tier });
    setModalError(null);
  }

  function closeModal() {
    setModal(null);
    setModalError(null);
  }

  async function handleCreate(fields: TierFormFields) {
    setModalSaving(true);
    setModalError(null);
    const payload: CreateTierPayload = {
      name: fields.name,
      level: fields.level,
      requiredWashes: fields.requiredWashes,
      priorityBookingDays: fields.priorityBookingDays,
      description: fields.description,
    };
    try {
      await createAdminTier(token, payload);
      closeModal();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Không thể tạo tier.");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleEdit(fields: TierFormFields) {
    if (modal?.kind !== "edit") return;
    setModalSaving(true);
    setModalError(null);
    const payload: UpdateTierPayload = {
      name: fields.name,
      level: fields.level,
      requiredWashes: fields.requiredWashes,
      priorityBookingDays: fields.priorityBookingDays,
      description: fields.description,
    };
    try {
      await updateAdminTier(token, modal.tier.id, payload);
      closeModal();
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Không thể cập nhật tier.");
    } finally {
      setModalSaving(false);
    }
  }

  if (loading && tiers.length === 0) {
    return <div className="py-10 text-center text-sm text-slate-500">Đang tải tier...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus size={15} />
          Thêm tier mới
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={load} /> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tên hạng</th>
              <th className="px-4 py-3">Cấp</th>
              <th className="px-4 py-3">Lần rửa yêu cầu</th>
              <th className="px-4 py-3">Đặt trước tối đa</th>
              <th className="px-4 py-3">Mô tả</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tiers.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Chưa có tier nào. Thêm mới bên trên.
                </td>
              </tr>
            ) : (
              tiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-950">{tier.name}</td>
                  <td className="px-4 py-3">
                    <TierLevelBadge level={tier.level} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="font-semibold">{tier.requiredWashes}</span>
                    <span className="ml-1 text-xs text-slate-400">lần</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {tier.priorityBookingDays > 0 ? (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                        {tier.priorityBookingDays} ngày
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Không giới hạn</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                    {tier.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(tier)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                      title="Sửa tier"
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

      {modal?.kind === "create" && (
        <TierFormModal
          title="Thêm tier mới"
          initial={{ name: "", level: 1, requiredWashes: 0, priorityBookingDays: 0, description: "" }}
          saving={modalSaving}
          error={modalError}
          onSubmit={handleCreate}
          onClose={closeModal}
        />
      )}

      {modal?.kind === "edit" && (
        <TierFormModal
          title={`Sửa tier: ${modal.tier.name}`}
          initial={{
            name: modal.tier.name,
            level: modal.tier.level,
            requiredWashes: modal.tier.requiredWashes,
            priorityBookingDays: modal.tier.priorityBookingDays,
            description: modal.tier.description ?? "",
          }}
          saving={modalSaving}
          error={modalError}
          onSubmit={handleEdit}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

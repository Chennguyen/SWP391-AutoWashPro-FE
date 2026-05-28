"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Edit2, Plus, RefreshCw, Search, Trash2, XCircle } from "lucide-react";
import {
  createBranch,
  deleteBranch,
  getBranches,
  updateBranch,
  type AdminBranch,
} from "@/lib/api/admin";
import { AdminError, AdminPageHeader, AdminShell } from "@/components/admin/shared/AdminUi";
import { useAdminToken } from "@/components/admin/shared/useAdminToken";
import { cn } from "@/lib/utils";

type BranchFormState = {
  Name: string;
  Address: string;
  IsActive: boolean;
};

const EMPTY_FORM: BranchFormState = { Name: "", Address: "", IsActive: true };

export function AdminBranchesPage() {
  const token = useAdminToken();
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBranch | null>(null);
  const [form, setForm] = useState<BranchFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBranches(token, {
        keyword,
        isActive: isActive === "all" ? undefined : isActive === "true",
      });
      setBranches(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải chi nhánh.");
    } finally {
      setLoading(false);
    }
  }, [isActive, keyword, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBranches(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(branch: AdminBranch) {
    setEditing(branch);
    setForm({ Name: branch.name, Address: branch.address, IsActive: branch.isActive });
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateBranch(token, editing.id, form);
      } else {
        await createBranch(token, { Name: form.Name, Address: form.Address });
      }
      setModalOpen(false);
      await loadBranches();
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : "Không thể lưu chi nhánh.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(branch: AdminBranch) {
    const ok = window.confirm(`Xóa chi nhánh "${branch.name}"?`);
    if (!ok) return;
    try {
      await deleteBranch(token, branch.id);
      await loadBranches();
    } catch (deleteError) {
      window.alert(deleteError instanceof Error ? deleteError.message : "Không thể xóa chi nhánh.");
    }
  }

  async function toggleStatus(branch: AdminBranch) {
    try {
      await updateBranch(token, branch.id, { IsActive: !branch.isActive });
      await loadBranches();
    } catch (statusError) {
      window.alert(statusError instanceof Error ? statusError.message : "Không thể cập nhật trạng thái.");
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Quản lý chi nhánh"
        description="Thêm, sửa, xóa và lọc chi nhánh rửa xe."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={16} aria-hidden />
            Thêm chi nhánh
          </button>
        }
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loadBranches();
        }}
        className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên hoặc địa chỉ"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select
          value={isActive}
          onChange={(event) => setIsActive(event.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Tạm ngưng</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Lọc
        </button>
      </form>

      {error ? <AdminError message={error} onRetry={loadBranches} /> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tên chi nhánh</th>
                <th className="px-4 py-3">Địa chỉ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={22} aria-hidden />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    Chưa có chi nhánh phù hợp.
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-950">{branch.name}</td>
                    <td className="px-4 py-3 text-slate-600">{branch.address}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void toggleStatus(branch)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                          branch.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-600",
                        )}
                      >
                        {branch.isActive ? <CheckCircle2 size={13} aria-hidden /> : <XCircle size={13} aria-hidden />}
                        {branch.isActive ? "Hoạt động" : "Tạm ngưng"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(branch)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                        title="Sửa"
                      >
                        <Edit2 size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(branch)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                        title="Xóa"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-950">
                {editing ? "Sửa chi nhánh" : "Thêm chi nhánh"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <label className="block text-sm font-semibold text-slate-700">
                Tên chi nhánh
                <input
                  required
                  value={form.Name}
                  onChange={(event) => setForm((current) => ({ ...current, Name: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Địa chỉ
                <input
                  required
                  value={form.Address}
                  onChange={(event) => setForm((current) => ({ ...current, Address: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              {editing ? (
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.IsActive}
                    onChange={(event) => setForm((current) => ({ ...current, IsActive: event.target.checked }))}
                    className="h-4 w-4 accent-blue-600"
                  />
                  Đang hoạt động
                </label>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

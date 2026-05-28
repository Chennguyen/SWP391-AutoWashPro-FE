"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, Lock, RefreshCw, Search, ShieldCheck, Unlock, XCircle } from "lucide-react";
import {
  getPendingUsers,
  getUser,
  getUsers,
  updateUserStatus,
  verifyUser,
  type AdminUser,
} from "@/lib/api/admin";
import { AdminError, AdminPageHeader, AdminShell } from "@/components/admin/shared/AdminUi";
import { useAdminToken } from "@/components/admin/shared/useAdminToken";
import { cn } from "@/lib/utils";

type UserTab = "all" | "pending";

export function AdminUsersPage() {
  const token = useAdminToken();
  const [tab, setTab] = useState<UserTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result =
        tab === "pending"
          ? await getPendingUsers(token, { searchTerm, pageIndex: 1, pageSize: 10 })
          : await getUsers(token, { searchTerm, pageIndex: 1, pageSize: 10 });
      setUsers(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải người dùng.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, tab, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

  async function handleView(user: AdminUser) {
    setActionLoading(user.id);
    try {
      const detail = await getUser(token, user.id);
      setSelectedUser(detail);
    } catch (viewError) {
      window.alert(viewError instanceof Error ? viewError.message : "Không thể tải chi tiết người dùng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleVerify(user: AdminUser) {
    setActionLoading(user.id);
    try {
      await verifyUser(token, user.id);
      await loadUsers();
    } catch (verifyError) {
      window.alert(verifyError instanceof Error ? verifyError.message : "Không thể xác minh người dùng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleStatus(user: AdminUser) {
    const nextStatus = user.status === "Locked" ? "Active" : "Locked";
    setActionLoading(user.id);
    try {
      await updateUserStatus(token, user.id, nextStatus);
      await loadUsers();
    } catch (statusError) {
      window.alert(statusError instanceof Error ? statusError.message : "Không thể cập nhật trạng thái.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Quản lý người dùng"
        description="Xem danh sách, xác minh tài khoản và khóa/mở khóa người dùng."
      />

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          {[
            ["all", "Tất cả"],
            ["pending", "Chờ xác minh"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as UserTab)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                tab === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadUsers();
          }}
          className="relative md:w-80"
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo email hoặc tên"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </form>
      </div>

      {error ? <AdminError message={error} onRetry={loadUsers} /> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Xác minh</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={22} aria-hidden />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Chưa có người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{user.fullName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{user.role || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", user.isVerified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                        {user.isVerified ? <CheckCircle2 size={13} aria-hidden /> : <XCircle size={13} aria-hidden />}
                        {user.isVerified ? "Đã xác minh" : "Chờ xác minh"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.status || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => void handleView(user)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950" title="Xem chi tiết">
                        <Eye size={16} aria-hidden />
                      </button>
                      {!user.isVerified ? (
                        <button type="button" onClick={() => void handleVerify(user)} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="Xác minh">
                          <ShieldCheck size={16} aria-hidden />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => void handleStatus(user)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title={user.status === "Locked" ? "Mở khóa" : "Khóa"}>
                        {user.status === "Locked" ? <Unlock size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
                      </button>
                      {actionLoading === user.id ? <RefreshCw className="ml-1 inline animate-spin text-blue-600" size={14} aria-hidden /> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-950">Chi tiết người dùng</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="font-semibold text-slate-500">Họ tên</dt><dd className="text-slate-950">{selectedUser.fullName}</dd></div>
              <div><dt className="font-semibold text-slate-500">Email</dt><dd className="text-slate-950">{selectedUser.email}</dd></div>
              <div><dt className="font-semibold text-slate-500">Số điện thoại</dt><dd className="text-slate-950">{selectedUser.phone || "-"}</dd></div>
              <div><dt className="font-semibold text-slate-500">Trạng thái</dt><dd className="text-slate-950">{selectedUser.status || "-"}</dd></div>
            </dl>
            <div className="mt-5 text-right">
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

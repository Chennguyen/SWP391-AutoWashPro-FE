"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Search, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getPendingUsers,
  getUser,
  getUsers,
  updateUserStatus,
  verifyUser,
  rejectUser,
  type AdminUser,
} from "@/lib/api/admin";
import { adjustCustomerPoints, type AdjustPointsAction } from "@/lib/api/loyalty-admin";
import { AdminError, AdminPageHeader, AdminShell } from "@/components/admin/shared/AdminUi";
import { useAdminToken } from "@/components/admin/shared/useAdminToken";
import { cn } from "@/lib/utils";

type UserTab = "all" | "pending";

function formatStatus(status?: string): string {
  if (!status) return "-";
  switch (status) {
    case "Pending":
      return "Chờ xác minh";
    case "Active":
      return "Hoạt động";
    case "Rejected":
      return "Bị từ chối";
    case "Locked":
      return "Bị khóa";
    case "Inactive":
      return "Không hoạt động";
    default:
      return status;
  }
}

/**
 * Thành phần (Component) AdminUsersPage
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminUsersPage() {
  const token = useAdminToken();
  const [tab, setTab] = useState<UserTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<AdminUser | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Xử lý fallback khi backend không trả về totalCount chính xác (hoặc fallback = pageSize)
  const isFullPage = users.length === 5;
  const calculatedTotalPages = Math.max(1, Math.ceil(totalCount / 5));
  const displayTotalPages = Math.max(pageIndex + (isFullPage ? 1 : 0), calculatedTotalPages);

  function getPageNumbers(): number[] {
    const delta = 2;
    const start = Math.max(1, pageIndex - delta);
    const end = Math.min(displayTotalPages, pageIndex + delta);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  const loadUsers = useCallback(async (page = pageIndex) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result =
        tab === "pending"
          ? await getPendingUsers(token, { searchTerm, pageIndex: page, pageSize: 5 })
          : await getUsers(token, { searchTerm, pageIndex: page, pageSize: 5 });
      setUsers(result.items);
      setTotalCount(result.totalCount);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải người dùng.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, tab, token, pageIndex]);

  useEffect(() => {
    setPageIndex(1);
  }, [tab, searchTerm]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUsers(pageIndex), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsers, pageIndex]);

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
      await loadUsers(pageIndex);
    } catch (verifyError) {
      window.alert(verifyError instanceof Error ? verifyError.message : "Không thể xác minh người dùng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleReject(user: AdminUser) {
    const reason = window.prompt("Nhập lý do từ chối hồ sơ FaceID của người dùng này:");
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      window.alert("Bạn phải nhập lý do từ chối.");
      return;
    }

    setActionLoading(user.id);
    try {
      await rejectUser(token, user.id, reason.trim());
      await loadUsers(pageIndex);
    } catch (rejectError) {
      window.alert(rejectError instanceof Error ? rejectError.message : "Không thể từ chối người dùng.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleStatus(user: AdminUser) {
    const nextStatus = user.status === "Locked" ? "Active" : "Locked";
    setActionLoading(user.id);
    try {
      await updateUserStatus(token, user.id, nextStatus);
      await loadUsers(pageIndex);
    } catch (statusError) {
      window.alert(statusError instanceof Error ? statusError.message : "Không thể cập nhật trạng thái.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleAdjustPoints(
    user: AdminUser,
    action: AdjustPointsAction,
    points: number,
    reason: string,
  ) {
    setActionLoading(user.id);
    try {
      await adjustCustomerPoints(token, user.id, { action, points, reason });
      window.alert(`${action === "ADD" ? "Cộng" : "Trừ"} ${points} điểm cho ${user.fullName} thành công.`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Không thể điều chỉnh điểm.");
    } finally {
      setActionLoading("");
      setAdjustTarget(null);
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
              onClick={() => {
                setTab(id as UserTab);
                setPageIndex(1);
              }}
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
            setPageIndex(1);
            void loadUsers(1);
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

      {error ? <AdminError message={error} onRetry={() => void loadUsers(pageIndex)} /> : null}

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
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => void handleView(user)}
                      title="Xem chi tiết"
                    >
                      <p className="font-semibold text-slate-950 hover:text-blue-600">{user.fullName}</p>
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
                    <td className="px-4 py-3 text-slate-600">{formatStatus(user.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {!user.isVerified ? (
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => void handleVerify(user)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100" title="Xác minh">
                            Duyệt
                          </button>
                          <button type="button" onClick={() => void handleReject(user)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100" title="Từ chối">
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <>
                          <button type="button" onClick={() => void handleStatus(user)} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold transition", user.status === "Locked" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100")} title={user.status === "Locked" ? "Mở khóa" : "Khóa"}>
                            {user.status === "Locked" ? "Mở khóa" : "Khóa"}
                          </button>
                          <button type="button" onClick={() => setAdjustTarget(user)} className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100" title="Điều chỉnh điểm">
                            Điểm
                          </button>
                        </>
                      )}
                      {actionLoading === user.id ? <RefreshCw className="ml-1 inline animate-spin text-blue-600" size={14} aria-hidden /> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(pageIndex > 1 || users.length > 0) && (
          <nav
            className="mt-6 mb-4 flex items-center justify-center gap-1"
            aria-label="Phân trang người dùng"
          >
            {/* Prev */}
            <button
              type="button"
              onClick={() => setPageIndex(pageIndex - 1)}
              disabled={pageIndex === 1 || loading}
              aria-label="Trang trước"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setPageIndex(page)}
                disabled={loading}
                aria-label={`Trang ${page}`}
                aria-current={page === pageIndex ? "page" : undefined}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition",
                  page === pageIndex
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {page}
              </button>
            ))}

            {/* Next */}
            <button
              type="button"
              onClick={() => setPageIndex(pageIndex + 1)}
              disabled={(pageIndex >= displayTotalPages && !isFullPage) || loading}
              aria-label="Trang sau"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        )}
      </div>

      {selectedUser ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="user-detail-title" className="text-lg font-bold text-slate-950">
              Chi tiết người dùng
            </h2>

            {/* Thông tin text */}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Họ tên</dt>
                <dd className="text-slate-950">{selectedUser.fullName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Email</dt>
                <dd className="truncate text-slate-950">{selectedUser.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Số điện thoại</dt>
                <dd className="text-slate-950">{selectedUser.phone || "-"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Trạng thái</dt>
                <dd className="text-slate-950">{formatStatus(selectedUser.status)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Xác minh Face ID</dt>
                <dd>
                  {selectedUser.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      ✓ Đã xác minh
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      ⏳ Chờ duyệt
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            {/* Lưới ảnh khuôn mặt */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Ảnh khuôn mặt (Face ID)
              </p>
              {selectedUser.faceImages && selectedUser.faceImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {selectedUser.faceImages.map((url, index) => (
                    <div
                      key={index}
                      className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Ảnh khuôn mặt ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">
                  Không có dữ liệu ảnh khuôn mặt.
                </p>
              )}
            </div>

            {/* Chân modal */}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setAdjustTarget(selectedUser);
                  setSelectedUser(null);
                }}
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
              >
                Điều chỉnh điểm
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>

              {/* Nút xác minh nhanh nếu chưa duyệt */}
              {!selectedUser.isVerified && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const reason = window.prompt("Nhập lý do từ chối hồ sơ FaceID:");
                      if (reason === null) return;
                      if (!reason.trim()) {
                        window.alert("Vui lòng nhập lý do.");
                        return;
                      }
                      setActionLoading(selectedUser.id);
                      try {
                        await rejectUser(token, selectedUser.id, reason.trim());
                        await loadUsers(pageIndex);
                        setSelectedUser(null);
                      } catch (rejectError) {
                        window.alert(rejectError instanceof Error ? rejectError.message : "Không thể từ chối người dùng.");
                      } finally {
                        setActionLoading("");
                      }
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Từ chối
                  </button>
                  <button
                    id="user-detail-verify-btn"
                    type="button"
                    onClick={async () => {
                      await handleVerify(selectedUser);
                      setSelectedUser(null);
                    }}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    ✓ Xác minh
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}


      {adjustTarget ? (
        <AdjustPointsDialog
          user={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onConfirm={handleAdjustPoints}
        />
      ) : null}
    </AdminShell>
  );
}

function AdjustPointsDialog({
  user,
  onClose,
  onConfirm,
}: {
  user: AdminUser;
  onClose: () => void;
  onConfirm: (user: AdminUser, action: AdjustPointsAction, points: number, reason: string) => Promise<void>;
}) {
  const [action, setAction] = useState<AdjustPointsAction>("ADD");
  const [points, setPoints] = useState(100);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) { window.alert("Vui lòng nhập lý do."); return; }
    setSaving(true);
    await onConfirm(user, action, points, reason.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950">Điều chỉnh điểm: {user.fullName}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <XCircle size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {(["ADD", "SUBTRACT"] as AdjustPointsAction[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                className={`flex-1 rounded-lg border py-2 text-sm font-bold transition ${
                  action === a
                    ? a === "ADD"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {a === "ADD" ? "+ Cộng điểm" : "− Trừ điểm"}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Số điểm</label>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lý do</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tặng điểm sự kiện..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

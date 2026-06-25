"use client";

import { FormEvent, useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, WalletCards, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { topUpWallet, getWalletTransactions, type Wallet } from "@/features/users/wallet-service";
import { type TransactionItem } from "@/types/transaction";
import { ApiError } from "@/lib/api-error";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface WalletPanelProps {
  token: string;
  wallet: Wallet | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onUnauthorized: () => void;
}

const TOP_UP_PRESETS = [100000, 200000, 500000];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTxDate(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTxTime(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionBadge(type: number | string) {
  const t = Number(type);
  const isDeposit = t === 0 || String(type).trim().toLowerCase() === "deposit";
  const isFullPayment = t === 1 || String(type).trim().toLowerCase() === "fullpayment";
  const isTopup = t === 2 || String(type).trim().toLowerCase() === "wallettopup";

  if (isDeposit) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Đặt cọc</Badge>;
  if (isFullPayment) return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Thanh toán</Badge>;
  if (isTopup) return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Nạp tiền</Badge>;
  
  return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{type}</Badge>;
}

function getAmountClassAndPrefix(type: number | string) {
  const t = Number(type);
  const isTopup = t === 2 || String(type).trim().toLowerCase() === "wallettopup";
  if (isTopup) return { className: "text-emerald-600 font-bold", prefix: "+" };
  return { className: "text-red-600 font-bold", prefix: "-" };
}

/**
 * Thành phần (Component) WalletPanel
 * 
 * Chức năng: Quản lý số dư, nạp ví và hiển thị lịch sử giao dịch ví của khách hàng.
 */
export function WalletPanel({
  token,
  wallet,
  loading,
  error,
  onRefresh,
  onUnauthorized,
}: WalletPanelProps) {
  const [amount, setAmount] = useState(500000);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // States cho lịch sử giao dịch
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadTransactions = useCallback(async () => {
    if (!token) return;
    setTxLoading(true);
    setTxError(null);
    try {
      const res = await getWalletTransactions({
        pageIndex,
        pageSize: 5,
      });
      setTransactions(res.transactions || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      setTxError(
        err instanceof Error ? err.message : "Không thể tải lịch sử giao dịch."
      );
    } finally {
      setTxLoading(false);
    }
  }, [token, pageIndex]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  async function handleTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopUpError(null);

    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError("Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    setSaving(true);
    try {
      await topUpWallet(token, amount);
      await onRefresh();
      setPageIndex(1);
      await loadTransactions();
    } catch (topUpException) {
      if (topUpException instanceof ApiError && topUpException.status === 401) {
        onUnauthorized();
        return;
      }

      setTopUpError(
        topUpException instanceof Error
          ? topUpException.message
          : "Không thể nạp ví, vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }

  const isUnverified = typeof window !== "undefined" && window.localStorage.getItem("is_unverified") === "true";

  return (
    <section aria-label="Thông tin ví" className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Thông tin ví</h2>
          <p className="mt-1 text-sm text-slate-500">Xem số dư và nạp tiền vào ví AutoWash Pro.</p>
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-lg">
        {isUnverified && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/75 backdrop-blur-[2px] p-6 text-center border border-slate-200 rounded-lg">
            <div className="rounded-full bg-slate-100 p-3 text-slate-500 shadow-sm border border-slate-200/50 mb-3 animate-pulse">
              <Lock size={24} className="text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Ví tạm thời khóa do tài khoản chưa được xác thực</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
              Tính năng ví sẽ tự động mở khóa sau khi quản trị viên phê duyệt tài khoản của bạn.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-white/70">Số dư hiện tại</span>
              <WalletCards size={22} className="text-blue-300" aria-hidden />
            </div>
            {loading && !wallet ? (
              <div className="mt-8 h-10 w-40 animate-pulse rounded bg-white/15" />
            ) : (
              <p className="mt-6 text-3xl font-black tracking-normal">
                {formatCurrency(wallet?.balance ?? 0)}
              </p>
            )}
            {wallet?.updatedAt ? (
              <p className="mt-3 text-xs text-white/55">
                Cập nhật: {new Date(wallet.updatedAt).toLocaleString("vi-VN")}
              </p>
            ) : null}
          </div>

          <form onSubmit={handleTopUp} className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">Nạp tiền</h3>
            <div className="mt-4">
              <label htmlFor="wallet-top-up" className="mb-1 block text-sm font-medium text-slate-700">
                Số tiền
              </label>
              <input
                id="wallet-top-up"
                type="number"
                min={1000}
                step={1000}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                disabled={saving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TOP_UP_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>

            {topUpError ? (
              <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {topUpError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Plus size={16} aria-hidden />
              {saving ? "Đang nạp..." : "Nạp ví"}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Lịch sử giao dịch ví ─── */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Lịch sử giao dịch ví</h3>
          <button
            type="button"
            onClick={() => void loadTransactions()}
            disabled={txLoading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
            aria-label="Làm mới lịch sử"
          >
            <RefreshCw size={15} className={txLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {txError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {txError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-slate-100">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px] text-xs font-bold uppercase text-slate-500">Ngày</TableHead>
                <TableHead className="w-[80px] text-xs font-bold uppercase text-slate-500">Giờ</TableHead>
                <TableHead className="w-[100px] text-xs font-bold uppercase text-slate-500">Loại</TableHead>
                <TableHead className="w-[140px] text-right text-xs font-bold uppercase text-slate-500">Số tiền</TableHead>
                <TableHead className="text-xs font-bold uppercase text-slate-500">Mô tả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-slate-500">
                    <RefreshCw className="mx-auto mb-1 animate-spin text-blue-600" size={18} />
                    Đang tải giao dịch...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-slate-500">
                    Chưa có giao dịch nào được ghi nhận.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const style = getAmountClassAndPrefix(tx.type);
                  return (
                    <TableRow key={tx.transactionId} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {formatTxDate(tx.transactionDate || tx.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatTxTime(tx.transactionDate || tx.createdAt)}
                      </TableCell>
                      <TableCell>{getTransactionBadge(tx.type)}</TableCell>
                      <TableCell className="text-right">
                        <span className={style.className}>
                          {style.prefix}{formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{tx.description || "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">Trang {pageIndex} / {totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                disabled={pageIndex <= 1 || txLoading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Trước
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                disabled={pageIndex >= totalPages || txLoading}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Thành phần (Component) AdminPageHeader
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-black text-slate-950 md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * Thành phần (Component) AdminLoading
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-white">
      <RefreshCw className="animate-spin text-blue-600" size={28} aria-hidden />
    </div>
  );
}

/**
 * Thành phần (Component) AdminError
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <p className="font-semibold">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

/**
 * Thành phần (Component) MetricCard
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "text-blue-600",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <Icon size={18} className={tone} aria-hidden />
      </div>
      <p className="mt-4 text-2xl font-black text-slate-950">{value}</p>
    </article>
  );
}

/**
 * Thành phần (Component) AdminShell
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">{children}</main>;
}

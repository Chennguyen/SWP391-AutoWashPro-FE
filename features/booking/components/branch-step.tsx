import { CheckCircle2, Clock, MapPin } from "lucide-react";
import type { Branch } from "@/features/booking/types/booking-types";

interface BranchStepProps {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  selected: Branch | null;
  onSelect: (branch: Branch) => void;
  onNext: () => void;
}

/**
 * Thành phần (Component) BranchStep
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function BranchStep({
  branches,
  loading,
  error,
  usingMock,
  selected,
  onSelect,
  onNext,
}: BranchStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Chọn chi nhánh</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn chi nhánh AutoWash Pro gần bạn nhất.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {usingMock ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Đang dùng dữ liệu chi nhánh test.
        </div>
      ) : null}

      {!loading && !error && branches.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center text-center">
          <MapPin size={42} className="mb-4 text-slate-200" aria-hidden />
          <p className="font-semibold text-slate-600">
            Chưa có chi nhánh nào khả dụng.
          </p>
          <p className="mt-1 text-sm text-slate-400">Vui lòng thử lại sau.</p>
        </div>
      ) : null}

      {branches.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {branches.map((branch) => {
            const isActive = branch.status === "ACTIVE";
            const isSelected = selected?.id === branch.id;

            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => isActive && onSelect(branch)}
                disabled={!isActive}
                aria-pressed={isSelected}
                className={`rounded-lg border-2 p-5 text-left transition ${
                  isSelected
                    ? "border-slate-950 bg-slate-50 shadow-sm"
                    : isActive
                      ? "border-slate-200 bg-white hover:border-slate-300"
                      : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-950">{branch.name}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin size={14} className="shrink-0" aria-hidden />
                      <span className="truncate">{branch.address}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock size={14} className="shrink-0" aria-hidden />
                      <span>
                        {branch.openTime} - {branch.closeTime}
                      </span>
                    </div>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 size={22} className="shrink-0 text-emerald-500" aria-hidden />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!selected}
          className="rounded-lg bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}

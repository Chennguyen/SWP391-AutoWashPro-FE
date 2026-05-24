// BranchStep — branch selection
// Receives pre-fetched branches from parent (fetched server-side with revalidate:300)

import type { Branch } from "@/types/booking";
import { MapPin, Clock, CheckCircle2 } from "lucide-react";

interface BranchStepProps {
  branches: Branch[];
  selected: Branch | null;
  onSelect: (branch: Branch) => void;
  onNext: () => void;
}

export function BranchStep({
  branches,
  selected,
  onSelect,
  onNext,
}: BranchStepProps) {
  if (branches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <MapPin size={36} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">Chưa có chi nhánh nào khả dụng.</p>
        <p className="text-slate-400 text-sm mt-1">Vui lòng thử lại sau.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Chọn chi nhánh</h2>
        <p className="text-sm text-slate-500 mt-0.5">Chọn chi nhánh AutoWash Pro gần bạn nhất.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map((b) => {
          const isActive = b.status === "ACTIVE";
          const isSelected = selected?.id === b.id;
          return (
            <button
              key={b.id}
              onClick={() => isActive && onSelect(b)}
              disabled={!isActive}
              aria-pressed={isSelected}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all
                ${isSelected
                  ? "border-slate-900 bg-slate-50 shadow-md"
                  : isActive
                  ? "border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm"
                  : "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 mb-1">{b.name}</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">{b.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Clock size={13} className="shrink-0" />
                    <span>{b.openTime} – {b.closeTime}</span>
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 size={22} className="text-emerald-500 shrink-0 mt-0.5" aria-hidden />
                )}
              </div>
              <span
                className={`inline-block mt-3 text-[11px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full
                  ${isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
                  }`}
              >
                {isActive ? "Đang hoạt động" : "Tạm đóng"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!selected}
          className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}

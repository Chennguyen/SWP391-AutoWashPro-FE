"use client";

import { Building2, Car, CalendarClock, Tag, Check, ChevronRight } from "lucide-react";
import type { WizardState } from "@/types/booking";

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

interface BookingProcessSummaryProps {
  state: WizardState;
  goTo: (step: number) => void;
}

interface SummaryRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  isDone: boolean;
  step: number;
  currentStep: number;
  goTo: (step: number) => void;
}

function SummaryRow({ icon, label, value, isDone, step, currentStep, goTo }: SummaryRowProps) {
  const isAccessible = step < currentStep || isDone;
  const isActive = step === currentStep;

  return (
    <div
      className={`group relative rounded-xl border p-3.5 transition-all duration-200 ${
        isDone
          ? "border-emerald-100 bg-emerald-50/60"
          : isActive
            ? "border-slate-200 bg-white shadow-sm"
            : "border-slate-100 bg-slate-50/40"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Status dot */}
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
            isDone
              ? "bg-emerald-500 text-white"
              : isActive
                ? "bg-slate-950 text-white"
                : "bg-slate-200 text-slate-400"
          }`}
        >
          {isDone ? <Check size={11} strokeWidth={3} /> : <span className="text-[10px]">{step}</span>}
        </div>

        <div className="min-w-0 flex-1">
          {/* Label */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDone ? "text-emerald-600" : "text-slate-400"}`}>
              {label}
            </span>
          </div>

          {/* Value or empty state */}
          <div className={`mt-1 text-sm font-semibold leading-snug ${isDone ? "text-slate-800" : "text-slate-400"}`}>
            {isDone ? value : (
              <span className="text-slate-300 text-xs italic">Chưa chọn</span>
            )}
          </div>
        </div>

        {/* Icon + change button */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`${isDone ? "text-emerald-400" : isActive ? "text-slate-600" : "text-slate-200"}`}>
            {icon}
          </span>
          {isAccessible && !isActive && (
            <button
              type="button"
              onClick={() => goTo(step)}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 active:scale-95"
            >
              Sửa
              <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Thành phần (Component) BookingProcessSummary
 *
 * Chức năng: Hiển thị tóm tắt quy trình đặt lịch ở cột bên phải.
 * Bao gồm: Chi nhánh, Xe, Khung giờ, Voucher, và Bảng tính tiền tạm tính.
 * Cho phép khách hàng bấm "Sửa" để quay lại bước tương ứng ngay lập tức.
 */
export function BookingProcessSummary({ state, goTo }: BookingProcessSummaryProps) {
  const { selectedBranch, selectedVehicle, selectedDate, selectedSlot, appliedVoucher, currentStep } = state;

  const isStep1Done = selectedBranch !== null;
  const isStep2Done = selectedVehicle !== null;
  const isStep3Done = selectedDate !== "" && selectedSlot !== "";
  const isStep4Done = currentStep > 4;

  const hasAnyProgress = isStep1Done || isStep2Done || isStep3Done || currentStep >= 4;

  return (
    <aside aria-label="Tóm tắt quy trình đặt lịch" className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 to-slate-800 px-4 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quy trình</p>
        <p className="mt-0.5 text-sm font-black text-white">Tóm tắt đặt lịch</p>
      </div>

      <div className="space-y-2 p-3">
        {/* Step 1 – Chi nhánh */}
        <SummaryRow
          icon={<Building2 size={15} />}
          label="Chi nhánh"
          value={
            selectedBranch ? (
              <div>
                <p className="text-slate-800 font-bold leading-tight">{selectedBranch.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{selectedBranch.address}</p>
              </div>
            ) : null
          }
          isDone={isStep1Done}
          step={1}
          currentStep={currentStep}
          goTo={goTo}
        />

        {/* Step 2 – Xe */}
        <SummaryRow
          icon={<Car size={15} />}
          label="Phương tiện"
          value={
            selectedVehicle ? (
              <div>
                <p className="font-bold text-slate-800">{selectedVehicle.licensePlate}</p>
                <p className="text-[11px] text-slate-400">{selectedVehicle.brand} {selectedVehicle.model}</p>
              </div>
            ) : null
          }
          isDone={isStep2Done}
          step={2}
          currentStep={currentStep}
          goTo={goTo}
        />

        {/* Step 3 – Khung giờ */}
        <SummaryRow
          icon={<CalendarClock size={15} />}
          label="Khung giờ"
          value={
            selectedDate && selectedSlot ? (
              <div>
                <p className="font-bold text-slate-800">{selectedSlot}</p>
                <p className="text-[11px] text-slate-400">{formatDate(selectedDate)}</p>
              </div>
            ) : null
          }
          isDone={isStep3Done}
          step={3}
          currentStep={currentStep}
          goTo={goTo}
        />

        {/* Step 4 – Voucher */}
        <SummaryRow
          icon={<Tag size={15} />}
          label="Voucher"
          value={
            appliedVoucher ? (
              <div>
                <p className="font-bold text-emerald-700">{appliedVoucher.code}</p>
                <p className="text-[11px] text-emerald-600">-{formatVND(appliedVoucher.discountAmount)}</p>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">Không dùng voucher</span>
            )
          }
          isDone={isStep4Done}
          step={4}
          currentStep={currentStep}
          goTo={goTo}
        />
      </div>

      {/* Ghi chú: Chi tiết tính tiền và đặt cọc được hiển thị ở bước Xác nhận thanh toán */}

      {/* Empty state khi mới vào trang */}
      {!hasAnyProgress && (
        <div className="px-4 pb-5 pt-1 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <CalendarClock size={18} className="text-slate-400" />
          </div>
          <p className="text-xs font-semibold text-slate-400">Các lựa chọn của bạn<br />sẽ hiện ra ở đây</p>
        </div>
      )}
    </aside>
  );
}

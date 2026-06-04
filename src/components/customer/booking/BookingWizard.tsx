"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api/api-error";
import { getBranches } from "@/lib/api/public-read";
import type { BookingResult, Branch, WizardState } from "@/types/booking";
import type { Vehicle } from "@/types/vehicle";
import { BranchStep } from "./BranchStep";
import { BookingSuccessStep } from "./BookingSuccessStep";
import { ReviewPaymentStep } from "./ReviewPaymentStep";
import { SlotStep } from "./SlotStep";
import { StepIndicator } from "./StepIndicator";
import { VehicleStep } from "./VehicleStep";
import { VoucherStep } from "./VoucherStep";

const INITIAL_STATE: WizardState = {
  selectedBranch: null,
  selectedVehicle: null,
  selectedDate: "",
  selectedSlot: "",
  voucherCode: "",
  appliedVoucher: null,
  bookingResult: null,
  currentStep: 1,
};

function subscribeToToken(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("autowash-auth", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("autowash-auth", onStoreChange);
  };
}

function normalizeStoredToken(value: string): string {
  const withoutBearer = value.trim().replace(/^Bearer\s+/i, "");

  if (
    (withoutBearer.startsWith('"') && withoutBearer.endsWith('"')) ||
    (withoutBearer.startsWith("'") && withoutBearer.endsWith("'"))
  ) {
    return withoutBearer.slice(1, -1).trim();
  }

  return withoutBearer;
}

function getTokenSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

function getServerTokenSnapshot(): string | null {
  return null;
}

/**
 * Thành phần (Component) BookingWizard
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function BookingWizard() {
  const tokenSnapshot = useSyncExternalStore(
    subscribeToToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );
  const token = tokenSnapshot ?? "";
  const authChecked = tokenSnapshot !== null;

  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [forcedDisabledSlots, setForcedDisabledSlots] = useState<string[]>([]);
  const [sessionExpired, setSessionExpired] = useState(false);

  function patch(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function goTo(step: number) {
    patch({ currentStep: step });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSlotUnavailable() {
    if (state.selectedDate && state.selectedSlot) {
      const slotKey = `${state.selectedDate}|${state.selectedSlot}`;
      setForcedDisabledSlots((current) =>
        current.includes(slotKey) ? current : [...current, slotKey],
      );
    }
    setSlotNotice("Slot này vừa có người đặt. Bro chọn lại slot còn trống nha.");
    patch({ selectedSlot: "", currentStep: 3 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handleUnauthorized = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("role");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("email");
    window.dispatchEvent(new Event("autowash-auth"));
    setSessionExpired(true);
  }, []);

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const nextBranches = await getBranches("", token);
      setBranches(nextBranches);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setBranches([]);
      setBranchesError(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách chi nhánh.",
      );
    } finally {
      setBranchesLoading(false);
    }
  }, [handleUnauthorized, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBranches();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  const { currentStep } = state;

  if (authChecked && !token) {
    return (
      <div className="flex min-h-80 items-center justify-center text-center">
        <div>
          <p className="font-semibold text-slate-800">
            {sessionExpired
              ? "Phiên đăng nhập đã hết hạn."
              : "Bạn cần đăng nhập để đặt lịch."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Đăng nhập lại để chọn xe, chọn slot và xác nhận booking.
          </p>
          <Link
            href="/auth/login"
            className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Đăng nhập lại
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <StepIndicator currentStep={currentStep} />

      <div className="min-h-[460px]">
        {currentStep === 1 ? (
          <BranchStep
            branches={branches}
            loading={branchesLoading}
            error={branchesError}
            usingMock={false}
            selected={state.selectedBranch}
            onRefresh={loadBranches}
            onSelect={(branch) => patch({ selectedBranch: branch })}
            onNext={() => goTo(2)}
          />
        ) : null}

        {currentStep === 2 ? (
          <VehicleStep
            token={token}
            selected={state.selectedVehicle}
            onSelect={(vehicle: Vehicle) => patch({ selectedVehicle: vehicle })}
            onNext={() => goTo(3)}
            onBack={() => goTo(1)}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}

        {currentStep === 3 && state.selectedBranch ? (
          <SlotStep
            token={token}
            branchId={state.selectedBranch.id}
            branchName={state.selectedBranch.name}
            notice={slotNotice}
            forcedDisabledSlots={forcedDisabledSlots}
            selectedDate={state.selectedDate}
            selectedSlot={state.selectedSlot}
            onDateChange={(date) => {
              setSlotNotice(null);
              patch({ selectedDate: date });
            }}
            onSlotChange={(slot) => {
              setSlotNotice(null);
              patch({ selectedSlot: slot });
            }}
            onNext={() => goTo(4)}
            onBack={() => goTo(2)}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}

        {currentStep === 4 ? (
          <VoucherStep
            token={token}
            voucherCode={state.voucherCode}
            appliedVoucher={state.appliedVoucher}
            onVoucherChange={(code) => patch({ voucherCode: code })}
            onVoucherApplied={(voucher) => patch({ appliedVoucher: voucher })}
            onNext={() => goTo(5)}
            onBack={() => goTo(3)}
          />
        ) : null}

        {currentStep === 5 &&
        state.selectedBranch &&
        state.selectedVehicle &&
        state.selectedDate &&
        state.selectedSlot ? (
          <ReviewPaymentStep
            token={token}
            branch={state.selectedBranch}
            vehicle={state.selectedVehicle}
            date={state.selectedDate}
            slot={state.selectedSlot}
            appliedVoucher={state.appliedVoucher}
            onSuccess={(result: BookingResult) => {
              patch({ bookingResult: result, currentStep: 6 });
            }}
            onBack={() => goTo(4)}
            onSlotUnavailable={handleSlotUnavailable}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}

        {currentStep === 6 && state.bookingResult ? (
          <BookingSuccessStep result={state.bookingResult} />
        ) : null}
      </div>
    </div>
  );
}

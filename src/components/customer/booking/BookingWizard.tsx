"use client";

import { useState } from "react";
import { StepIndicator } from "./StepIndicator";
import { BranchStep } from "./BranchStep";
import { VehicleStep } from "./VehicleStep";
import { SlotStep } from "./SlotStep";
import { VoucherStep } from "./VoucherStep";
import { ReviewPaymentStep } from "./ReviewPaymentStep";
import { BookingSuccessStep } from "./BookingSuccessStep";
import type { WizardState } from "@/types/booking";
import type { Branch, BookingResult } from "@/types/booking";
import type { Vehicle } from "@/types/vehicle";

interface BookingWizardProps {
  token: string;
  initialBranches: Branch[]; // pre-fetched server-side with revalidate:300
}

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

export function BookingWizard({ token, initialBranches }: BookingWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  function patch(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  function goTo(step: number) {
    patch({ currentStep: step });
    // Scroll wizard to top on step change
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const { currentStep } = state;

  return (
    <div className="space-y-8">
      {/* Step indicator — always visible except step 6 */}
      {currentStep < 6 && <StepIndicator currentStep={currentStep} />}

      {/* Step content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && (
          <BranchStep
            branches={initialBranches}
            selected={state.selectedBranch}
            onSelect={(b) => patch({ selectedBranch: b })}
            onNext={() => goTo(2)}
          />
        )}

        {currentStep === 2 && (
          <VehicleStep
            token={token}
            selected={state.selectedVehicle}
            onSelect={(v: Vehicle) => patch({ selectedVehicle: v })}
            onNext={() => goTo(3)}
            onBack={() => goTo(1)}
          />
        )}

        {currentStep === 3 && state.selectedBranch && (
          <SlotStep
            token={token}
            branchId={state.selectedBranch.id}
            selectedDate={state.selectedDate}
            selectedSlot={state.selectedSlot}
            onDateChange={(d) => patch({ selectedDate: d })}
            onSlotChange={(s) => patch({ selectedSlot: s })}
            onNext={() => goTo(4)}
            onBack={() => goTo(2)}
          />
        )}

        {currentStep === 4 && (
          <VoucherStep
            token={token}
            voucherCode={state.voucherCode}
            appliedVoucher={state.appliedVoucher}
            onVoucherChange={(code) => patch({ voucherCode: code })}
            onVoucherApplied={(v) => patch({ appliedVoucher: v })}
            onNext={() => goTo(5)}
            onBack={() => goTo(3)}
          />
        )}

        {currentStep === 5 &&
          state.selectedBranch &&
          state.selectedVehicle &&
          state.selectedDate &&
          state.selectedSlot && (
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
            />
          )}

        {currentStep === 6 && state.bookingResult && (
          <BookingSuccessStep result={state.bookingResult} />
        )}
      </div>
    </div>
  );
}

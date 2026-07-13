"use client";

import { Building2, Car, CalendarClock, ReceiptText, Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { WizardState } from "@/features/booking/types/booking-types";

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
      className={cn(
        "group relative rounded-xl border p-3.5 transition",
        isDone && "border-primary/20 bg-muted/50",
        isActive && "border-primary bg-background shadow-sm",
        !isDone && !isActive && "border-border bg-muted/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition",
            (isDone || isActive) && "bg-primary text-primary-foreground",
            !isDone && !isActive && "!bg-white/10 !text-[#c5beb3]",
          )}
        >
          {isDone ? <Check aria-hidden /> : <span className="text-[10px]">{step}</span>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDone || isActive ? "!text-[#d8bd84]" : "!text-[#c5beb3]")}>
              {label}
            </span>
          </div>

          <div className={cn("mt-1 text-sm font-semibold leading-snug", isDone ? "text-foreground" : "text-muted-foreground")}>
            {isDone ? value : (
              <span className="text-xs italic !text-[#a09c94]">Chưa chọn</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn(isDone || isActive ? "!text-[#d8bd84]" : "!text-[#a09c94]")}>
            {icon}
          </span>
          {isAccessible && !isActive && (
            <Button
              type="button"
              onClick={() => goTo(step)}
              variant="ghost"
              size="xs"
              className="h-6 px-1.5 text-[10px]"
            >
              Sửa
              <ChevronRight data-icon="inline-end" />
            </Button>
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
  const { selectedBranch, selectedVehicle, selectedDate, selectedSlot, currentStep } = state;

  const isStep1Done = selectedBranch !== null;
  const isStep2Done = selectedVehicle !== null;
  const isStep3Done = selectedDate !== "" && selectedSlot !== "";
  const isStep4Done = currentStep > 4;

  const hasAnyProgress = isStep1Done || isStep2Done || isStep3Done || currentStep >= 4;

  return (
    <aside aria-label="Tóm tắt quy trình đặt lịch">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Quy trình</p>
              <CardTitle className="mt-1">Tóm tắt đặt lịch</CardTitle>
            </div>
            <Badge variant="secondary">Bước {currentStep}/6</Badge>
          </div>
        </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <SummaryRow
          icon={<Building2 />}
          label="Chi nhánh"
          value={
            selectedBranch ? (
              <div>
                <p className="font-semibold leading-tight text-foreground">{selectedBranch.name}</p>
                <p className="mt-0.5 text-[11px] leading-tight !text-[#c5beb3]">{selectedBranch.address}</p>
              </div>
            ) : null
          }
          isDone={isStep1Done}
          step={1}
          currentStep={currentStep}
          goTo={goTo}
        />

        <SummaryRow
          icon={<Car />}
          label="Phương tiện"
          value={
            selectedVehicle ? (
              <div>
                <p className="font-semibold text-foreground tabular-nums">{selectedVehicle.licensePlate}</p>
                <p className="text-[11px] !text-[#c5beb3]">{selectedVehicle.brand} {selectedVehicle.model}</p>
              </div>
            ) : null
          }
          isDone={isStep2Done}
          step={2}
          currentStep={currentStep}
          goTo={goTo}
        />

        <SummaryRow
          icon={<CalendarClock />}
          label="Khung giờ"
          value={
            selectedDate && selectedSlot ? (
              <div>
                <p className="font-semibold text-foreground tabular-nums">{selectedSlot}</p>
                <p className="text-[11px] !text-[#c5beb3]">{formatDate(selectedDate)}</p>
              </div>
            ) : null
          }
          isDone={isStep3Done}
          step={3}
          currentStep={currentStep}
          goTo={goTo}
        />

        <SummaryRow
          icon={<ReceiptText />}
          label="Bảng giá"
          value={
            <span className="text-[11px] !text-[#c5beb3]">Đã xem chi tiết phí</span>
          }
          isDone={isStep4Done}
          step={4}
          currentStep={currentStep}
          goTo={goTo}
        />
        <Separator className="my-1" />

        {!hasAnyProgress && (
          <div className="pb-2 pt-1 text-center">
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
              <CalendarClock className="text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Các lựa chọn của bạn<br />sẽ hiện ra ở đây</p>
          </div>
        )}
      </CardContent>
      </Card>
    </aside>
  );
}

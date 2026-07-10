"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Chi nhánh", description: "Nơi sử dụng dịch vụ" },
  { number: 2, label: "Xe", description: "Phương tiện cần rửa" },
  { number: 3, label: "Lịch hẹn", description: "Ngày và khung giờ" },
  { number: 4, label: "Bảng giá", description: "Phí dịch vụ" },
  { number: 5, label: "Xác nhận", description: "Cọc và ưu đãi" },
  { number: 6, label: "Hoàn tất", description: "Kết quả đặt lịch" },
];

interface StepIndicatorProps {
  currentStep: number;
}

const STEP_TRANSITION_MS = 420;

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function progressForStep(step: number) {
  return (step - 1) / (STEPS.length - 1);
}

/**
 * Thành phần (Component) StepIndicator
 *
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const [visualStep, setVisualStep] = useState(currentStep);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setVisualStep(currentStep);
      timeoutRef.current = null;
    }, prefersReducedMotion() ? 0 : STEP_TRANSITION_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentStep]);

  const activeScale = progressForStep(currentStep);

  return (
    <nav aria-label="Tiến trình đặt lịch" className="w-full py-1">
      <ol className="relative grid h-7 grid-cols-6 items-center px-1">
        <span
          aria-hidden
          className="absolute left-[calc(100%/12)] right-[calc(100%/12)] top-1/2 h-px -translate-y-1/2 bg-border"
        />
        <span
          aria-hidden
          className="absolute left-[calc(100%/12)] right-[calc(100%/12)] top-1/2 h-px -translate-y-1/2 origin-left bg-primary transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ transform: `scaleX(${activeScale})` }}
        />

        {STEPS.map((step) => {
          const done = step.number < visualStep;
          const active = step.number === visualStep;
          const upcoming = step.number > visualStep;
          const isCurrentStep = step.number === currentStep;
          const ariaLabel = `${step.label}: ${step.description}`;

          return (
            <li
              key={step.number}
              aria-label={ariaLabel}
              aria-current={isCurrentStep ? "step" : undefined}
              className="relative z-10 flex justify-center"
            >
              <span className="relative flex size-7 items-center justify-center" aria-hidden>
                <span
                  aria-hidden
                  className={cn(
                    "absolute size-3 rotate-45 rounded-[2px] border transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                    (active || done) && "border-primary bg-primary",
                    active && "scale-110 opacity-100",
                    upcoming && "border-border bg-muted opacity-80",
                    done && "scale-75 opacity-0",
                  )}
                  style={
                    active
                      ? {
                          boxShadow:
                            "0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent), 0 0 18px color-mix(in srgb, var(--primary) 42%, transparent), 0 0 34px color-mix(in srgb, var(--primary) 20%, transparent)",
                        }
                      : upcoming
                        ? {
                            boxShadow:
                              "0 0 0 2px color-mix(in srgb, var(--border) 24%, transparent)",
                          }
                        : undefined
                  }
                />

                <Check
                  aria-hidden
                  className={cn(
                    "absolute rounded-full border border-primary bg-card p-0.5 text-primary opacity-0 shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_28%,transparent)] transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                    done ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-45 opacity-0",
                  )}
                />
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

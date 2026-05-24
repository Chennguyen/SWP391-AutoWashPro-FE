// StepIndicator — pure display, no interactivity needed → Server Component compatible
// (used inside a Client Component parent, but doesn't need "use client" itself)

interface Step {
  number: number;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Chi nhánh" },
  { number: 2, label: "Chọn xe" },
  { number: 3, label: "Chọn slot" },
  { number: 4, label: "Voucher" },
  { number: 5, label: "Xác nhận" },
  { number: 6, label: "Hoàn tất" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Tiến trình đặt lịch" className="w-full">
      {/* Desktop: full labels */}
      <ol className="hidden sm:flex items-center w-full">
        {STEPS.map((step, idx) => {
          const done = step.number < currentStep;
          const active = step.number === currentStep;
          return (
            <li key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                    ${done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : active
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-400"
                    }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? "✓" : step.number}
                </div>
                <span
                  className={`mt-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap
                    ${active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-18px] transition-colors
                    ${step.number < currentStep ? "bg-emerald-400" : "bg-slate-100"}`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact progress */}
      <div className="sm:hidden flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">
          Bước {currentStep} / {STEPS.length}:{" "}
          <span className="text-slate-600">{STEPS[currentStep - 1]?.label}</span>
        </span>
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <div
              key={s.number}
              className={`h-1.5 w-5 rounded-full transition-all
                ${s.number < currentStep
                  ? "bg-emerald-400"
                  : s.number === currentStep
                  ? "bg-slate-900 w-8"
                  : "bg-slate-100"
                }`}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

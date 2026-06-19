interface Step {
  number: number;
  label: string;
}

const STEPS: Step[] = [
  { number: 1, label: "Chi nhánh" },
  { number: 2, label: "Chọn xe" },
  { number: 3, label: "Chọn slot" },
  { number: 4, label: "Bảng giá" },
  { number: 5, label: "Xác nhận" },
  { number: 6, label: "Hoàn tất" },
];

interface StepIndicatorProps {
  currentStep: number;
}

/**
 * Thành phần (Component) StepIndicator
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Tiến trình đặt lịch" className="w-full">
      <ol className="hidden items-start sm:flex">
        {STEPS.map((step, index) => {
          const done = step.number < currentStep;
          const active = step.number === currentStep;

          return (
            <li key={step.number} className="flex flex-1 items-start">
              <div className="flex min-w-20 flex-col items-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : done
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? "✓" : step.number}
                </div>
                <span
                  className={`mt-2 text-center text-xs font-bold ${
                    active ? "text-slate-950" : done ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={`mt-5 h-0.5 flex-1 rounded-full ${
                    step.number < currentStep ? "bg-blue-200" : "bg-slate-100"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="sm:hidden">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-950">
            Bước {currentStep}/{STEPS.length}
          </span>
          <span className="text-slate-500">{STEPS[currentStep - 1]?.label}</span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`h-1.5 rounded-full ${
                step.number <= currentStep ? "bg-slate-950" : "bg-slate-100"
              }`}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

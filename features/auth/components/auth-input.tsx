"use client";

import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { InputHTMLAttributes, ReactNode, forwardRef, useState } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightLabel?: ReactNode;
  showRequiredAsterisk?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      error,
      rightLabel,
      showRequiredAsterisk,
      className,
      type,
      id,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-2.5">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="select-none text-sm font-medium text-[#f3eadc]"
          >
            {label}
            {showRequiredAsterisk && (
              <span className="text-red-500 ml-1 font-semibold">*</span>
            )}
          </label>
          {rightLabel && (
            <span className="text-xs text-[#d8bd84] transition-colors hover:text-[#f0d89f]">
              {rightLabel}
            </span>
          )}
        </div>

        {/* Input wrapper */}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={inputType}
            className={cn(
              "h-14 w-full rounded-full border border-white/20 bg-transparent px-5 text-sm text-[#fffaf0] placeholder:text-[#777168]",
              "outline-none ring-0 transition-all duration-200",
              "focus:border-[#d8bd84] focus:ring-2 focus:ring-[#d8bd84]/20",
              "hover:border-white/35",
              error &&
                "!border-red-400 !ring-1 !ring-red-400/40 focus:!border-red-400 focus:!ring-2 focus:!ring-red-400/20",
              isPassword && "pr-12",
              className,
            )}
            {...props}
          />

          {/* Show/hide password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#d8bd84] outline-none transition-colors hover:text-[#f0d89f] focus-visible:ring-2 focus-visible:ring-[#d8bd84]/60"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={id ? `${id}-error` : undefined}
            role="alert"
            className="mt-1 text-xs font-medium !text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";

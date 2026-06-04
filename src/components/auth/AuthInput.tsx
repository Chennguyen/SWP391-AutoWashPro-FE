"use client";

import { InputHTMLAttributes, forwardRef, useState, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightLabel?: ReactNode;
  showRequiredAsterisk?: boolean;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, rightLabel, showRequiredAsterisk, className, type, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label row */}
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-700 select-none"
          >
            {label}
            {showRequiredAsterisk && (
              <span className="text-red-500 ml-1 font-semibold">*</span>
            )}
          </label>
          {rightLabel && (
            <span className="text-xs text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
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
              "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400",
              "outline-none ring-0 transition-all duration-200",
              "focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15",
              "hover:border-gray-300",
              error && "!border-red-500 !ring-1 !ring-red-500 focus:!border-red-500 focus:!ring-2 focus:!ring-red-500/20",
              isPassword && "pr-11",
              className
            )}
            {...props}
          />

          {/* Show/hide password toggle */}
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs font-medium !text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";

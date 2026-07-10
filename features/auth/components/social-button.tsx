"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SocialButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon: ReactNode;
}

/**
 * Thành phần (Component) SocialButton
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function SocialButton({ children, icon, className, ...props }: SocialButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3",
        "text-sm font-medium text-gray-700",
        "transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20",
        "active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

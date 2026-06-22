import { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
}

/**
 * Thành phần (Component) AuthCard
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-[0_8px_40px_-8px_rgba(37,99,235,0.12),0_2px_12px_-2px_rgba(0,0,0,0.07)] border border-gray-100/80 px-8 py-10 sm:px-10">
      {children}
    </div>
  );
}

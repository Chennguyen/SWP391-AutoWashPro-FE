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
    <div className="mx-auto w-full max-w-[520px] bg-transparent">
      {children}
    </div>
  );
}

import { ReactNode } from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Thành phần (Component) AuthLayout
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background-outer"
      style={{
        background: "linear-gradient(135deg, #070708 0%, #0E0E10 50%, #050505 100%)",
      }}
    >
      {/* Subtle decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(188, 163, 116, 0.15) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 -right-32 w-[400px] h-[400px] rounded-full opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(188, 163, 116, 0.12) 0%, transparent 70%)",
        }}
      />


      {/* Main content (card) */}
      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>

      {/* Bottom footer */}
      <p className="mt-8 text-xs text-gray-400 text-center relative z-10">
        Tiếp tục nghĩa là bạn đồng ý{" "}
        <Link href="#" className="underline underline-offset-2 hover:text-gray-600 transition-colors">
          Điều khoản
        </Link>
        {" · "}
        <Link href="#" className="underline underline-offset-2 hover:text-gray-600 transition-colors">
          Bảo mật
        </Link>
      </p>
    </div>
  );
}

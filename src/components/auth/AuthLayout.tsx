import { ReactNode } from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #EAF3FF 0%, #F8FBFF 50%, #DBEAFE 100%)",
      }}
    >
      {/* Subtle decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-40"
        style={{
          background: "radial-gradient(circle, #BFDBFE 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 -right-32 w-[400px] h-[400px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, #93C5FD 0%, transparent 70%)",
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

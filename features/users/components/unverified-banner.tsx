"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

/**
 * Component UnverifiedBanner
 * 
 * Chức năng: Hiển thị banner cảnh báo tài khoản đang chờ phê duyệt từ quản trị viên.
 * Banner này hiển thị cố định ở đầu trang, ngay dưới Header chính và không có nút đóng (X).
 */
export function UnverifiedBanner() {
  const [isUnverified, setIsUnverified] = useState(false);

  useEffect(() => {
    function checkStatus() {
      if (typeof window !== "undefined") {
        setIsUnverified(window.localStorage.getItem("is_unverified") === "true");
      }
    }

    checkStatus();

    window.addEventListener("autowash-auth", checkStatus);
    window.addEventListener("storage", checkStatus);

    return () => {
      window.removeEventListener("autowash-auth", checkStatus);
      window.removeEventListener("storage", checkStatus);
    };
  }, []);

  if (!isUnverified) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-14 z-30 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-md transition-all duration-300 md:text-sm"
    >
      <ShieldAlert size={16} className="shrink-0 animate-pulse text-amber-50" aria-hidden />
      <span>Tài khoản đang được hệ thống xác thực, vui lòng đợi trong ít phút.</span>
    </div>
  );
}

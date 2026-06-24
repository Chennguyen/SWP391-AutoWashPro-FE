import Link from 'next/link';

/**
 * Thành phần (Component) Logo
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function Logo() {
  return (
    <Link
      href="/"
      className="text-sm font-semibold tracking-[0.25em] uppercase text-[#F5F5F2]"
    >
      AUTOWASH <span className="text-[#A3A3A3]">PRO</span>
    </Link>
  );
}
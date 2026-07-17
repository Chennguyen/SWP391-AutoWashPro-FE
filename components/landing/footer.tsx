import { Logo } from '@/shared/components/logo';

/**
 * Thành phần (Component) Footer
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function Footer() {
  return (
    <footer
      id="ho-tro"
      className="scroll-mt-20 border-t border-white/[0.06] bg-[#09090b] px-5 pb-8 pt-12 sm:px-8 lg:px-10"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-xs leading-5 text-[#a09c94]">
            Đặt lịch rửa xe trực tuyến và quản lý quyền lợi thành viên trong một nền tảng thống nhất.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8c49f]">
            Hỗ trợ
          </h4>
          <p className="text-xs leading-5 text-[#a09c94]">
            Mọi thắc mắc vui lòng liên hệ:<br />
            <a
              href="mailto:support@autowashpro.vn"
              className="!text-[#d8c49f] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f]"
            >
              support@autowashpro.vn
            </a>
          </p>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-start justify-between gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center">
        <p className="text-[10px] uppercase tracking-wider text-[#77736c]">
          &copy; {new Date().getFullYear()} AutoWash Pro. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import { LandingActionLink } from './marketing-image';

/**
 * Thành phần (Component) FinalCTA
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function FinalCTA() {
  return (
    <section className="border-t border-white/[0.08] bg-[var(--background-outer)] px-5 py-16 sm:px-8 md:py-20 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 border-l-2 border-[#bca374] pl-6 sm:pl-9 md:flex-row md:items-end md:justify-between md:gap-12">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white md:text-5xl">
            Sẵn sàng cho lần rửa tiếp theo?
          </h2>
          <p className="mt-4 max-w-[52ch] text-base leading-7 text-[#c4c0b6]">
            Chọn chi nhánh và thời gian phù hợp để bắt đầu lịch hẹn.
          </p>
        </div>

        <LandingActionLink
          customerHref="/customer/booking"
          className="inline-flex min-h-12 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#d8c49f] px-8 py-3 text-sm font-bold uppercase tracking-[0.14em] !text-[#17130f] transition-colors duration-200 hover:bg-[#ead8b4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e10] active:translate-y-px"
        >
          Đặt lịch ngay
        </LandingActionLink>
      </div>
    </section>
  );
}

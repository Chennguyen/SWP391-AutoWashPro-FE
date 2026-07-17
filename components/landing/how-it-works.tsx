import { marketingBanners } from './marketing-banner-data';
import { LandingActionLink, MarketingImage } from './marketing-image';

const steps = [
  {
    title: 'Chọn chi nhánh phù hợp',
    description: 'Chọn địa điểm thuận tiện cho lịch trình của bạn.',
  },
  {
    title: 'Chọn ngày và khung giờ',
    description: 'Chủ động chọn thời gian còn trống trên hệ thống.',
  },
  {
    title: 'Xác nhận lịch hẹn',
    description: 'Nhận thông tin xác nhận ngay sau khi hoàn tất.',
  },
  {
    title: 'Nhận điểm sau khi hoàn tất',
    description: 'Tích lũy điểm và mở thêm quyền lợi thành viên.',
  },
];

/**
 * Thành phần (Component) HowItWorks
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function HowItWorks() {
  return (
    <section
      id="quy-trinh"
      className="scroll-mt-20 border-t border-white/[0.08] bg-[#161619] px-5 py-16 sm:px-8 md:py-20 lg:px-10"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0e0e10] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="group relative aspect-[4/3] min-w-0 sm:min-h-[320px] lg:aspect-auto lg:min-h-[600px]">
          <MarketingImage
            banner={marketingBanners.smartBooking}
            sizes="(max-width: 1024px) 100vw, 54vw"
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10]/35 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#0e0e10]/45" />
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-9 md:py-12 lg:px-12">
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-white md:text-5xl">
            Đặt trước. Đến đúng giờ.
          </h2>
          <p className="mt-4 max-w-[48ch] text-base leading-7 text-[#c4c0b6]">
            Hoàn tất lịch hẹn trực tuyến để chủ động thời gian tại trạm.
          </p>

          <ol className="mt-8 grid grid-cols-1 gap-x-7 sm:grid-cols-2">
            {steps.map((step) => (
              <li key={step.title} className="border-t border-white/[0.1] py-5">
                <h3 className="text-lg font-bold leading-6 text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#a09c94]">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>

          <LandingActionLink
            customerHref="/customer/booking"
            className="mt-3 inline-flex min-h-11 w-fit items-center justify-center whitespace-nowrap rounded-full border border-[#bca374] px-6 py-2.5 text-sm font-bold !text-[#d8c49f] transition-colors duration-200 hover:bg-[#bca374] hover:!text-[#17130f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bca374] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e10] active:translate-y-px"
          >
            Đặt lịch ngay
          </LandingActionLink>
        </div>
      </div>
    </section>
  );
}

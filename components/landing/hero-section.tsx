import { marketingBanners } from './marketing-banner-data';
import { LandingActionLink, MarketingImage } from './marketing-image';

/**
 * Thành phần (Component) HeroSection
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function HeroSection() {
  return (
    <section className="relative flex h-[78dvh] min-h-[620px] max-h-[720px] items-center overflow-hidden bg-[#0e0e10] pt-[72px] md:h-[82dvh] md:min-h-[640px] md:max-h-[760px]">
      <MarketingImage
        banner={marketingBanners.hero}
        priority
        sizes="100vw"
        className="absolute inset-0"
        imageClassName="opacity-90"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,14,16,0.96)_0%,rgba(14,14,16,0.84)_34%,rgba(14,14,16,0.28)_68%,rgba(14,14,16,0.12)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10]/70 via-transparent to-[#0e0e10]/20" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d8c49f]">
          Đặt lịch rửa xe trực tuyến
        </p>
        <h1 className="max-w-2xl text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl md:text-6xl lg:text-[4.25rem]">
          <span className="block">Đặt trước.</span>
          <span className="block font-bold">Đến là rửa.</span>
        </h1>
        <p className="mt-6 max-w-[36rem] text-base leading-7 text-white/80 md:text-lg">
          Chủ động chọn thời gian, chăm sóc xe nhanh hơn và nhận quyền lợi sau mỗi lần rửa.
        </p>
        <LandingActionLink
          customerHref="/customer/booking"
          className="mt-8 inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-full bg-[#d8c49f] px-8 py-3 text-sm font-bold uppercase tracking-[0.14em] !text-[#17130f] transition-colors duration-200 hover:bg-[#ead8b4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e10] active:translate-y-px"
        >
          Đặt lịch ngay
        </LandingActionLink>
      </div>
    </section>
  );
}

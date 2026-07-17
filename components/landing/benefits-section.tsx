import Link from "next/link";
import { marketingBanners } from "./marketing-banner-data";
import { LandingActionLink, MarketingImage } from "./marketing-image";

export function BenefitsSection() {
  return (
    <section
      id="tinh-nang"
      className="scroll-mt-20 border-t border-white/[0.08] bg-[var(--background-outer)] px-5 py-16 sm:px-8 md:py-20 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-white md:text-5xl">
            Chăm sóc xe theo cách chủ động hơn.
          </h2>
          <p className="mt-4 max-w-[58ch] text-base leading-7 text-[#c4c0b6]">
            Công nghệ rửa tự động kết hợp đặt lịch trực tuyến và lịch sử dịch vụ rõ ràng.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.85fr] lg:items-start">
          <article className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#161619] sm:min-h-[520px] lg:min-h-[650px]">
            <MarketingImage
              banner={marketingBanners.editorialCare}
              sizes="(max-width: 1024px) 100vw, 62vw"
              className="aspect-[16/10] w-full sm:absolute sm:inset-0 sm:aspect-auto"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/18 to-transparent sm:block" />
            <div className="p-6 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-9">
              <h3 className="max-w-xl text-2xl font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-4xl">
                Sạch chuẩn từng chi tiết.
              </h3>
              <p className="mt-3 max-w-[46ch] text-sm leading-6 text-white/75 sm:text-base">
                Theo dõi quy trình chăm sóc xe trong một trải nghiệm nhất quán.
              </p>
              <Link
                href="#quy-trinh"
                className="mt-5 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/55 bg-[#0e0e10]/65 px-6 py-2.5 text-sm font-bold !text-white backdrop-blur-sm transition-colors duration-200 hover:border-[#d8c49f] hover:!text-[#d8c49f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] active:translate-y-px"
              >
                Xem quy trình
              </Link>
            </div>
          </article>

          <article className="group overflow-hidden rounded-2xl border border-white/[0.1] bg-[#161619]">
            <MarketingImage
              banner={marketingBanners.editorialWash}
              sizes="(max-width: 1024px) 100vw, 38vw"
              className="aspect-[16/10] w-full lg:aspect-[4/3]"
            />
            <div className="p-6 sm:p-8">
              <h3 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                Đến trạm với lịch hẹn sẵn sàng.
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#a09c94] sm:text-base">
                Chọn chi nhánh và khung giờ phù hợp trước khi di chuyển.
              </p>
              <LandingActionLink
                customerHref="/customer/booking"
                className="mt-5 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[#d8c49f] px-6 py-2.5 text-sm font-bold !text-[#17130f] transition-colors duration-200 hover:bg-[#ead8b4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#161619] active:translate-y-px"
              >
                Đặt lịch ngay
              </LandingActionLink>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

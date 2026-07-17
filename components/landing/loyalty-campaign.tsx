import { marketingBanners } from "./marketing-banner-data";
import { LandingActionLink, MarketingImage } from "./marketing-image";

export function LoyaltyCampaign() {
  return (
    <section className="border-t border-white/[0.08] bg-[#161619] px-5 py-16 sm:px-8 md:py-20 lg:px-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 overflow-hidden rounded-2xl border border-[#bca374]/25 bg-[#0e0e10] md:grid-cols-[0.78fr_1.22fr]">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-9 md:px-10 lg:px-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d8c49f]">
            Quyền lợi thành viên
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-[1.08] tracking-[-0.025em] text-white md:text-4xl">
            Điểm thưởng cho những lần rửa tiếp theo.
          </h2>
          <p className="mt-4 max-w-[42ch] text-sm leading-6 text-[#c4c0b6] sm:text-base">
            Theo dõi hạng thành viên, voucher hiện có và phần thưởng có thể quy đổi trên dashboard.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LandingActionLink
              customerHref="/customer"
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[#d8c49f] px-6 py-2.5 text-sm font-bold !text-[#17130f] transition-colors duration-200 hover:bg-[#ead8b4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e10] active:translate-y-px"
            >
              Xem quyền lợi
            </LandingActionLink>
            <LandingActionLink
              customerHref="/customer/profile?tab=rank"
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/25 px-6 py-2.5 text-sm font-bold !text-white transition-colors duration-200 hover:border-[#d8c49f] hover:!text-[#d8c49f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] active:translate-y-px"
            >
              Xem hạng thành viên
            </LandingActionLink>
          </div>
        </div>

        <div className="group relative aspect-[4/3] min-w-0 sm:min-h-[300px] md:aspect-auto md:min-h-[430px]">
          <MarketingImage
            banner={marketingBanners.loyalty}
            sizes="(max-width: 768px) 100vw, 61vw"
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10]/30 via-transparent to-transparent md:bg-gradient-to-r md:from-[#0e0e10]/40 md:via-transparent md:to-transparent" />
        </div>
      </div>
    </section>
  );
}

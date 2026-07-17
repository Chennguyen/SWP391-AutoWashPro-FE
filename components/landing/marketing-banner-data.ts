export const marketingBanners = {
  hero: {
    src: "/images/banner5.png",
    alt: "Xe màu đen đang được làm sạch trong hệ thống rửa xe tự động AutoWash Pro",
    desktopPosition: "68% center",
    mobilePosition: "72% center",
  },
  smartBooking: {
    src: "/images/banner4.png",
    alt: "Xe màu cam tiến vào trạm rửa xe tự động AutoWash Pro",
    desktopPosition: "34% center",
    mobilePosition: "30% center",
  },
  editorialCare: {
    src: "/images/banner1.png",
    alt: "Xe thể thao được chăm sóc tại không gian rửa xe cao cấp AutoWash Pro",
    desktopPosition: "58% center",
    mobilePosition: "62% center",
  },
  editorialWash: {
    src: "/images/banner2.png",
    alt: "Xe thể thao trong quy trình rửa xe tự động AutoWash Pro",
    desktopPosition: "61% center",
    mobilePosition: "62% center",
  },
  loyalty: {
    src: "/images/banner3.png",
    alt: "Xe SUV và thẻ quyền lợi thành viên AutoWash Pro",
    desktopPosition: "68% center",
    mobilePosition: "72% center",
  },
} as const;

export type MarketingBanner =
  (typeof marketingBanners)[keyof typeof marketingBanners];

export type LandingCustomerHref =
  | "/customer"
  | "/customer/booking"
  | "/customer/profile?tab=rank";

export function resolveLandingHref(
  isCustomer: boolean,
  customerHref: LandingCustomerHref,
) {
  return isCustomer ? customerHref : "/sign-in";
}

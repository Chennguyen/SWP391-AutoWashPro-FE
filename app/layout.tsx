import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";
import QueryProvider from "@/shared/providers/query-provider";

const utmForum = localFont({
  src: "../shared/font/UTM-Forum.ttf",
  variable: "--font-utm-forum",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AutoWash Pro - Premium Car Wash Booking",
  description: "Đặt lịch rửa xe dễ dàng. Tích điểm sau mỗi lần sử dụng.",
};

/**
 * Bố cục (Layout) RootLayout
 * 
 * Chức năng: Định nghĩa khung bố cục chung (Layout Template) cho hệ thống AutoWash Pro.
 * Vai trò: Quản lý cấu trúc bao bọc giao diện chung cho các trang con.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${utmForum.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

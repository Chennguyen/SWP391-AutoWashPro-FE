import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

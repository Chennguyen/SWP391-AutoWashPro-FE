import Link from 'next/link';

/**
 * Thành phần (Component) FinalCTA
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function FinalCTA() {
  return (
    <section className="relative bg-white py-36 px-8 md:px-16 overflow-hidden border-t border-black/[0.06]">
      {/* Subtle wide decorative line across middle */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-black/[0.04] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-12">
        {/* Text block */}
        <div>
          <p className="text-sm tracking-[0.3em] uppercase text-black/60 mb-6 font-medium">Bắt đầu ngay</p>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black tracking-tight leading-tight max-w-2xl">
            Sẵn sàng đặt lịch<br />
            <span className="font-extrabold">rửa xe tiếp theo?</span>
          </h2>
          <p className="text-xl text-black/80 mt-6 max-w-lg leading-relaxed">
            Tạo tài khoản, đặt lịch trước và bắt đầu tích điểm thành viên ngay hôm nay.
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0">
          <Link
            href="/auth/login"
            className="inline-block text-base font-bold tracking-[0.2em] uppercase text-white bg-[#050505] border border-[#050505] rounded-full px-12 py-6 hover:bg-black hover:scale-105 transition-all duration-300 shadow-xl shadow-black/10"
          >
            Đặt lịch ngay
          </Link>
        </div>
      </div>
    </section>
  );
}

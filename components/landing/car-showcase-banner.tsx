import Image from 'next/image';

/**
 * Thành phần (Component) CarShowcaseBanner
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function CarShowcaseBanner() {
  return (
    <section className="relative w-full h-[60vh] min-h-[420px] overflow-hidden bg-[#050505]">
      {/* Full-width cinematic car image */}
      <Image
        src="/images/hero-car.png"
        alt="AutoWash Pro — Chăm sóc xe đẳng cấp"
        fill
        sizes="100vw"
        className="object-cover object-center grayscale opacity-60"
      />

      {/* Left-to-right subtle darkening gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/40" />

      {/* Optional bottom caption strip */}
      <div className="absolute bottom-0 left-0 right-0 px-8 md:px-16 pb-10 flex items-end justify-between">
        <p className="text-[10px] tracking-[0.35em] uppercase text-[#444]">
          AutoWash Pro — Premium Car Care
        </p>
        <div className="hidden md:flex items-center gap-3 text-[#333]">
          <div className="w-12 h-[1px] bg-[#333]" />
          <span className="text-[10px] tracking-[0.25em] uppercase">Thành viên</span>
        </div>
      </div>
    </section>
  );
}

import Image from 'next/image';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative h-screen min-h-[680px] flex items-end pb-24 md:pb-32 bg-[#050505] overflow-hidden">
      {/* Cinematic background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-car.png"
          alt="AutoWash Pro — Chăm sóc xe đẳng cấp"
          fill
          priority
          loading="eager"
          sizes="100vw"
          className="object-cover object-center opacity-70"
        />
        {/* Left-to-right dark gradient so left text is clearly readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
        {/* Subtle overall darkening veil */}
        <div className="absolute inset-0 bg-[#050505]/30" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 w-full px-8 md:px-16 max-w-7xl mx-auto">
        {/* Eyebrow label */}
        <p className="text-sm tracking-[0.3em] uppercase text-white/80 mb-6 font-medium">
          Smart Car Wash Management
        </p>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-medium text-white leading-[1.1] tracking-tight mb-8 max-w-3xl">
          Đặt lịch rửa xe<br />
          <span className="font-bold">dễ dàng.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl lg:text-2xl text-white/90 max-w-2xl leading-relaxed mb-12">
          AutoWash Pro giúp bạn đặt lịch trước, theo dõi lịch sử chăm sóc xe và nhận quyền lợi thành viên theo từng hạng.
        </p>

        {/* Single CTA */}
        <Link
          href="/login"
          className="inline-block text-sm md:text-base font-bold tracking-[0.2em] uppercase text-white border border-white px-10 py-5 hover:bg-white hover:text-black transition-all duration-300"
        >
          Đặt lịch ngay
        </Link>
      </div>

      {/* Bottom scroll hint */}
      <div className="absolute bottom-8 right-8 md:right-16 z-10 flex items-center gap-3 text-white/80">
        <div className="w-12 h-[1px] bg-white/80" />
        <span className="text-xs tracking-[0.25em] uppercase font-medium">Cuộn xuống</span>
      </div>
    </section>
  );
}
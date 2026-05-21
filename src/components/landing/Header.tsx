import Link from 'next/link';
import { Logo } from '../common/Logo';

export function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16 py-7 bg-[#050505]/60 backdrop-blur-sm border-b border-white/[0.06]">
      {/* Brand */}
      <Logo />

      {/* Single primary CTA */}
      <Link
        href="/auth/login"
        className="text-xs font-medium tracking-[0.2em] uppercase text-[#D1D5DB] border border-white/20 px-6 py-3 hover:border-white/50 hover:text-[#F5F5F2] transition-all duration-300"
      >
        Đặt lịch
      </Link>
    </header>
  );
}
import Link from 'next/link';
import { Logo } from '../common/Logo';

// Server Component — no interactivity needed
export function Header() {
  const navLinks = [
    { label: 'Giới thiệu', href: '#gioi-thieu' },
    { label: 'Tính năng',  href: '#tinh-nang'  },
    { label: 'Quy trình',  href: '#quy-trinh'  },
    { label: 'Hỗ trợ',     href: '#ho-tro'     },
  ];

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 md:px-16 py-7">
      {/* Brand */}
      <div className="flex-1">
        <Logo />
      </div>

      {/* Center Navigation */}
      <nav className="hidden lg:flex items-center justify-center gap-10 flex-1" aria-label="Menu chính">
        {navLinks.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="relative text-[11px] font-semibold tracking-[0.2em] uppercase text-white/60 hover:text-white transition-colors duration-300 group"
          >
            {label}
            <span
              aria-hidden="true"
              className="absolute -bottom-1.5 left-0 w-0 h-[1px] bg-white/70 transition-all duration-300 group-hover:w-full"
            />
          </Link>
        ))}
      </nav>

      {/* Right CTA */}
      <div className="flex-1 flex justify-end">
        <Link
          href="/auth/login"
          style={{ color: '#000000' }}
          className="text-xs font-bold tracking-[0.2em] uppercase bg-white border border-white rounded-full px-6 py-2.5 hover:bg-white/90 hover:scale-105 transition-all duration-300"
        >
          Đặt lịch
        </Link>
      </div>
    </header>
  );
}
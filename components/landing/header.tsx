import Link from 'next/link';
import { Logo } from '@/shared/components/logo';
import { LandingActionLink } from './marketing-image';

// Server Component - interactivity is isolated inside LandingActionLink.
export function Header() {
  const navLinks = [
    { label: 'Giới thiệu', href: '#gioi-thieu' },
    { label: 'Tính năng',  href: '#tinh-nang'  },
    { label: 'Quy trình',  href: '#quy-trinh'  },
    { label: 'Hỗ trợ',     href: '#ho-tro'     },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-30 h-[72px] border-b border-white/[0.08] bg-[#0e0e10]/65 backdrop-blur-md">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
        <div className="shrink-0">
          <Logo />
        </div>

        <nav
          className="hidden min-w-0 items-center justify-center gap-5 lg:flex xl:gap-8"
          aria-label="Menu chính"
        >
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="relative whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] !text-white/80 transition-colors duration-200 hover:!text-[#d8c49f] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#bca374]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <LandingActionLink
          customerHref="/customer/booking"
          className="shrink-0 whitespace-nowrap rounded-full border border-[#d8c49f] bg-[#d8c49f] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] !text-[#17130f] transition-colors duration-200 hover:bg-[#ead8b4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8c49f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e10] active:translate-y-px sm:px-6"
        >
          Đặt lịch ngay
        </LandingActionLink>
      </div>
    </header>
  );
}

import Link from 'next/link';

export function Logo() {
  return (
    <Link
      href="/"
      className="text-sm font-semibold tracking-[0.25em] uppercase text-[#F5F5F2]"
    >
      AUTOWASH <span className="text-[#A3A3A3]">PRO</span>
    </Link>
  );
}
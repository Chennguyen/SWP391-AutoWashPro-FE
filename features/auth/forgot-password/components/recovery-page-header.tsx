import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RecoveryPageHeaderProps {
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
}

export function RecoveryPageHeader({
  backHref,
  backLabel,
  title,
  description,
}: RecoveryPageHeaderProps) {
  return (
    <div className="mb-8 text-left">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="mb-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#d8bd84] transition-colors hover:bg-white/5 hover:text-[#f0d89f]"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>

      <h1 className="text-[clamp(2.25rem,4vw,3.15rem)] font-semibold leading-none tracking-normal text-[#f7efe3]">
        {title}
      </h1>
      <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-[#c8c0b4]">
        {description}
      </p>
    </div>
  );
}

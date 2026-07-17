"use client";

import { getTokenSnapshot, subscribeToToken } from "@/features/booking/utils";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import {
  resolveLandingHref,
  type LandingCustomerHref,
  type MarketingBanner,
} from "./marketing-banner-data";

function getIsCustomerSnapshot() {
  if (typeof window === "undefined") return false;

  const token = getTokenSnapshot();
  const role = window.localStorage.getItem("role")?.trim().toLowerCase() ?? "";

  return Boolean(token && role !== "admin");
}

function getServerIsCustomerSnapshot() {
  return false;
}

type LandingActionLinkProps = {
  children: ReactNode;
  className?: string;
  customerHref: LandingCustomerHref;
};

export function LandingActionLink({
  children,
  className,
  customerHref,
}: LandingActionLinkProps) {
  const isCustomer = useSyncExternalStore(
    subscribeToToken,
    getIsCustomerSnapshot,
    getServerIsCustomerSnapshot,
  );

  return (
    <Link href={resolveLandingHref(isCustomer, customerHref)} className={className}>
      {children}
    </Link>
  );
}

type MarketingImageProps = {
  banner: MarketingBanner;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes: string;
};

export function MarketingImage({
  banner,
  className,
  imageClassName,
  priority = false,
  sizes,
}: MarketingImageProps) {
  const focalPointStyle = {
    "--landing-image-position-mobile": banner.mobilePosition,
    "--landing-image-position-desktop": banner.desktopPosition,
  } as CSSProperties;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={banner.src}
        alt={banner.alt}
        fill
        priority={priority}
        loading={priority ? undefined : "lazy"}
        sizes={sizes}
        style={focalPointStyle}
        className={cn(
          "object-cover [object-position:var(--landing-image-position-mobile)] transition-transform duration-700 ease-out md:[object-position:var(--landing-image-position-desktop)] motion-reduce:transition-none motion-safe:group-hover:scale-[1.015]",
          imageClassName,
        )}
      />
    </div>
  );
}

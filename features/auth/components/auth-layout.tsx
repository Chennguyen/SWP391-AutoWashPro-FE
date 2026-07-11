import Image from "next/image";
import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-template relative grid min-h-screen place-items-center overflow-x-hidden p-4 text-[#f6efe4] sm:p-6">
      {/* Background video */}
      <video
        className="absolute inset-0 h-full w-full object-cover object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/loginSideImage.png"
        aria-hidden="true"
      >
        <source src="/video/AuthenBackgroundVideo.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Optional luxury gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(188,163,116,0.12),transparent_65%)]" />

      {/* Auth card */}
      <div className="relative z-10 grid w-full max-w-[1180px] overflow-hidden rounded-[28px] border border-[#d8c49f]/70 bg-[#10100f]/90 shadow-[0_0_70px_rgba(188,163,116,0.18),0_34px_90px_rgba(0,0,0,0.65)] backdrop-blur-md lg:min-h-[min(720px,calc(100vh-3rem))] lg:grid-cols-[1fr_0.96fr] lg:rounded-[38px]">
        {/* Left image */}
        <div className="relative hidden h-full overflow-hidden border-r border-[#d8c49f]/25 lg:block">
          <Image
            src="/images/loginSideImage.png"
            alt="Premium car wash"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-center"
          />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.06)_42%,rgba(0,0,0,0.3)_100%)]" />
        </div>

        {/* Form */}
        <div className="flex min-h-[calc(100vh-2rem)] min-w-0 flex-col px-5 py-7 sm:px-8 lg:min-h-[min(720px,calc(100vh-3rem))] lg:px-10 lg:py-9 xl:px-12">
          <div className="my-auto w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

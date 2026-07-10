import { Header }             from "@/components/landing/header";
import { HeroSection }         from "@/components/landing/hero-section";
import { AboutSection }        from "@/components/landing/about-section";
import { HowItWorks }          from "@/components/landing/how-it-works";
import { BenefitsSection }     from "@/components/landing/benefits-section";

import { FinalCTA }            from "@/components/landing/final-cta";
import { Footer }              from "@/components/landing/footer";

/**
 * Trang (Page) Home
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/page.tsx
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#F5F5F2]">
      <Header />
      <HeroSection />
      <AboutSection />
      <HowItWorks />
      <BenefitsSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
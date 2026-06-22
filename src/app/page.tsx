import { Header }             from "@/components/landing/Header";
import { HeroSection }         from "@/components/landing/HeroSection";
import { AboutSection }        from "@/components/landing/AboutSection";
import { HowItWorks }          from "@/components/landing/HowItWorks";
import { BenefitsSection }     from "@/components/landing/BenefitsSection";

import { FinalCTA }            from "@/components/landing/FinalCTA";
import { Footer }              from "@/components/landing/Footer";

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
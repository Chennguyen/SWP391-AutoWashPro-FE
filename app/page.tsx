import { Header }             from "@/components/landing/header";
import { HeroSection }         from "@/components/landing/hero-section";
import { AboutSection }        from "@/components/landing/about-section";
import { HowItWorks }          from "@/components/landing/how-it-works";
import { BenefitsSection }     from "@/components/landing/benefits-section";
import { LoyaltyCampaign }     from "@/components/landing/loyalty-campaign";
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
    <main className="landing-page min-h-[100dvh] overflow-x-clip bg-[var(--background-outer)] text-[#fffdf9]">
      <Header />
      <HeroSection />
      <AboutSection />
      <HowItWorks />
      <BenefitsSection />
      <LoyaltyCampaign />
      <FinalCTA />
      <Footer />
    </main>
  );
}

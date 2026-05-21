import { Header }             from "@/components/landing/Header";
import { HeroSection }         from "@/components/landing/HeroSection";
import { AboutSection }        from "@/components/landing/AboutSection";
import { HowItWorks }          from "@/components/landing/HowItWorks";
import { BenefitsSection }     from "@/components/landing/BenefitsSection";
import { CarShowcaseBanner }   from "@/components/landing/CarShowcaseBanner";
import { FinalCTA }            from "@/components/landing/FinalCTA";
import { Footer }              from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#F5F5F2]">
      <Header />
      <HeroSection />
      <AboutSection />
      <HowItWorks />
      <BenefitsSection />
      <CarShowcaseBanner />
      <FinalCTA />
      <Footer />
    </main>
  );
}
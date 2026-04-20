import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import LiveMarketsSection from "@/components/LiveMarketsSection";
import NewsFeedSection from "@/components/NewsFeedSection";
import OKOTokenSection from "@/components/OKOTokenSection";
import PaymentSection from "@/components/PaymentSection";
import LeaderboardSection from "@/components/LeaderboardSection";
import DeveloperSection from "@/components/DeveloperSection";
import FooterCTA from "@/components/FooterCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A12] overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <LiveMarketsSection />
      <NewsFeedSection />
      <OKOTokenSection />
      <PaymentSection />
      <LeaderboardSection />
      <DeveloperSection />
      <FooterCTA />
      <Footer />
    </main>
  );
}

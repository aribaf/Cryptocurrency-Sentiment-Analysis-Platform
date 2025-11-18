import React from "react";
import Header from "../Header";
import Hero from "../Hero/Hero";
import UserCarousel from "../UserCarouel";
import WhySection from "../WhySection";
import HowItWorks from "../HowItWorks";
import CTAJoin from "../CTAJoin";
import FAQ from "../FAQ";
import Footer from "../Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-cp-bg text-gray-200">
      <Header />
      <Hero />
      <UserCarousel />
      <WhySection />
      <HowItWorks />
      <CTAJoin />
      <FAQ />
      <Footer />
    </div>
  );
}

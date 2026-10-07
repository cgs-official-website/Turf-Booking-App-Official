import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Pricing } from './components/Pricing';
import { Testimonials } from './components/Testimonials';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { InquiryModal } from '../../components/InquiryForm';

export const Landing = () => {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-poppins font-sans selection:bg-emerald-500 selection:text-white antialiased overflow-x-hidden transition-colors duration-200"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* 1. Header Navigation Bar */}
      <Navbar onExploreTurfs={() => scrollToSection('how-it-works')} />

      {/* Main Content Area (padding-top 64px for fixed navbar) */}
      <main className="pt-16 flex-1">
        {/* 2. Hero Section with 3D Canvas */}
        <Hero onExploreTurfs={() => scrollToSection('how-it-works')} />

        {/* 3. How It Works Section */}
        <HowItWorks />

        {/* 4. Vendor Subscription Plans Section */}
        <Pricing onSelectPlan={() => setInquiryModalOpen(true)} />

        {/* 5. Reviews & Testimonials Section */}
        <Testimonials />

        {/* 6. Contact Desk & Inquiries Section */}
        <Contact />
      </main>

      {/* 7. Footer Section */}
      <Footer onOpenInquiryModal={() => setInquiryModalOpen(true)} />

      {/* Public Inquiry Modal */}
      <InquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        sourcePage="Landing Page Modal"
      />
    </div>
  );
};

export default Landing;

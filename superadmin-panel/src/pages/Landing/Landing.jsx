import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { Pricing } from './components/Pricing';
import { Testimonials } from './components/Testimonials';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { InquiryModal } from '../../components/InquiryForm';

export const Landing = ({ onNavigateAdmin }) => {
  const [selectedTurfForBooking, setSelectedTurfForBooking] = useState(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookNow = () => {
    scrollToSection('pricing');
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-poppins font-sans selection:bg-emerald-500 selection:text-white antialiased overflow-x-hidden transition-colors duration-200"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* 1. Header Navigation Bar */}
      <Navbar
        onNavigateAdmin={onNavigateAdmin}
        onExploreTurfs={() => scrollToSection('how-it-works')}
        onBookNow={handleBookNow}
      />

      {/* Main Content Area (padding-top 64px for fixed navbar) */}
      <main className="pt-16 flex-1">
        {/* 2. Hero Section with 3D Canvas */}
        <Hero
          onNavigateAdmin={onNavigateAdmin}
          onExploreTurfs={() => scrollToSection('how-it-works')}
          onBookNow={handleBookNow}
        />

        {/* 3. How It Works Section */}
        <HowItWorks
          onBookNow={handleBookNow}
          onNavigateAdmin={onNavigateAdmin}
        />

        {/* 5. Vendor Subscription Plans Section */}
        <Pricing onSelectPlan={() => setInquiryModalOpen(true)} />

        {/* 6. Reviews & Testimonials Section */}
        <Testimonials />

        {/* 7. Contact Desk & Inquiries Section */}
        <Contact />
      </main>

      {/* 8. Footer Section */}
      <Footer
        onNavigateAdmin={onNavigateAdmin}
        onOpenInquiryModal={() => setInquiryModalOpen(true)}
      />

      {/* Interactive Booking Modal */}
      <BookingModal
        isOpen={!!selectedTurfForBooking}
        turf={selectedTurfForBooking}
        onClose={() => setSelectedTurfForBooking(null)}
      />

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

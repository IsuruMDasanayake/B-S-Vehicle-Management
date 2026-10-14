import React, { useState, useEffect } from 'react';
import './website.css';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StatsCard } from './components/StatsCard';
import { CompanySnapshot } from './components/CompanySnapshot';
import { About } from './components/About';
import { MissionVision } from './components/MissionVision';
import { EPCServices } from './components/EPCServices';
import { ProjectPortfolio } from './components/ProjectPortfolio';
import { Clients } from './components/Clients';
import { Divisions } from './components/Divisions';
import { FuturePlans } from './components/FuturePlans';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { FloatingActions } from './components/FloatingActions';
import { IntroLoader } from './components/IntroLoader';

export const CircleGroupWebsite = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedInterest, setSelectedInterest] = useState('');

  // ScrollSpy to update active nav state based on scroll position
  useEffect(() => {
    const sectionIds = ['home', 'about', 'services', 'portfolio', 'divisions', 'clients', 'contact'];

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Bottom of page activates contact
      if (scrollY + windowHeight >= documentHeight - 80) {
        setActiveSection('contact');
        return;
      }

      // Check which section contains the viewport reading line (180px below top)
      const focusY = scrollY + 180;
      let matched = sectionIds[0];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (focusY >= top && focusY < top + height) {
            matched = id;
            break;
          } else if (focusY >= top) {
            matched = id;
          }
        }
      }

      setActiveSection(matched);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scrolling Fade-in Reveal Animations using IntersectionObserver
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.cgw [data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.cgw [data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08,
      }
    );

    const elements = document.querySelectorAll('.cgw [data-reveal]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="cgw">
      {/* First-load Splash Animation */}
      <IntroLoader />

      {/* Floating Actions: WhatsApp & Circular Scroll-Progress Back-to-Top */}
      <FloatingActions />

      {/* Split-pill Floating Header */}
      <Header activeSection={activeSection} />

      {/* Hero Section: "Engineering a Sustainable Energy Future" */}
      <Hero />

      {/* Floating Metric Counter: 50 MW, 70+ MW, 2.4 MW, WTC Colombo */}
      <StatsCard />

      {/* Corporate Factsheet: Registration PV 00344227, Head Office, Operations */}
      <CompanySnapshot />

      {/* About Section: Narrative from Page 3 with real engineering photos */}
      <About />

      {/* Vision & Mission: Page 4 with Naula & Hambantota banners */}
      <MissionVision />

      {/* 6-Pillar Integrated EPC Delivery Matrix (Page 5) */}
      <EPCServices />

      {/* Project Portfolio: Naula 2.4MW, Hambantota 50MW, Kegalle 3.5MW & Collaborative Track Record */}
      <ProjectPortfolio />

      {/* Corporate Divisions: Solar EPC, Vehicle Fleet Logistics, Sustainable Plantation */}
      <Divisions />

      {/* Clients & Collaborations (Page 9) */}
      <Clients />

      {/* Future Plans: 5 Strategic Priorities for Long-Term Growth (Page 10) */}
      <FuturePlans />

      {/* Contact Section: 30th Floor WTC East Tower, +94 11 234 0400, circlegroup.lk@gmail.com */}
      <Contact initialInterest={selectedInterest} />

      {/* Deep Navy Corporate Footer with Registration PV 00344227 */}
      <Footer />
    </div>
  );
};

export default CircleGroupWebsite;

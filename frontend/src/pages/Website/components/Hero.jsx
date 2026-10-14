import React from 'react';
import { ArrowRight } from 'lucide-react';
import { hero } from '../content';

export const Hero = () => {
  return (
    <section id="home" className="cgw-hero">
      {/* Background Image & Overlay */}
      <img
        src={hero.image}
        alt="Circle Engineering Solar & Infrastructure Installation"
        className="cgw-hero-bg"
        loading="eager"
      />
      <div className="cgw-hero-overlay" />

      {/* Hero Content */}
      <div className="cgw-container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="cgw-hero-content">
          <div className="cgw-hero-eyebrow" data-reveal>
            <span>●</span> {hero.eyebrow}
          </div>

          <h1 className="cgw-hero-title" data-reveal data-delay="100" style={{ color: '#FFFFFF' }}>
            <span className="cgw-headline-eng">Engineering</span> a{' '}
            <span className="cgw-hero-highlight" style={{ color: 'var(--cgw-accent)' }}>
              {hero.highlight}
            </span>{' '}
            {hero.titleLine2}
          </h1>

          <p
            className="cgw-hero-subtitle"
            data-reveal
            data-delay="200"
            style={{ color: 'rgba(255, 255, 255, 0.9)' }}
          >
            {hero.subtitle}
          </p>

          <div className="cgw-hero-buttons" data-reveal data-delay="300">
            <a href={hero.primaryCta.href} className="cgw-btn cgw-btn-primary" style={{ padding: '0.9rem 2rem' }}>
              <span>{hero.primaryCta.label}</span>
              <ArrowRight size={18} />
            </a>

            <a href={hero.secondaryCta.href} className="cgw-btn cgw-btn-outline-white" style={{ padding: '0.9rem 2rem' }}>
              <span>{hero.secondaryCta.label}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Arc Divider at Bottom */}
      <div className="cgw-hero-arc" aria-hidden="true">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" fill="var(--cgw-white)">
          <path d="M0,60 C360,10 1080,10 1440,60 L1440,60 L0,60 Z" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;

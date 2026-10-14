import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, LogIn } from 'lucide-react';
import { nav, company } from '../content';
import { CELogo } from './CELogo';

export const Header = ({ activeSection = 'home' }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`cgw-header ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="cgw-container">
          <div className="cgw-header-inner">
            {/* Logo Pill */}
            <a href="#home" className="cgw-header-logo-pill" aria-label="Circle Engineering Homepage">
              <CELogo variant="horizontal" height={36} color="#1046A0" textColor="#1B2129" />
            </a>

            {/* Desktop Navigation Pill */}
            <nav className="cgw-header-nav-pill" aria-label="Main Navigation">
              {nav.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`cgw-nav-link ${activeSection === item.id ? 'is-active' : ''}`}
                >
                  {item.label}
                </a>
              ))}

              {/* Subtle Staff Portal link to /portal */}
              {/* <a
                href="/portal"
                className="cgw-header-portal-link"
                title="Employee & Division Portals"
              >
                <LogIn size={14} />
                <span>Portal</span>
              </a> */}

              {/* Get A Quote CTA Button */}
              <a href="#contact" className="cgw-btn cgw-btn-primary" style={{ padding: '0.55rem 1.3rem', fontSize: '0.88rem' }}>
                Get a Quote
              </a>
            </nav>

            {/* Mobile Nav Toggle */}
            <button
              type="button"
              className="cgw-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`cgw-mobile-drawer ${mobileOpen ? 'is-open' : ''}`}>
        <div className="cgw-mobile-backdrop" onClick={() => setMobileOpen(false)} />
        <div className="cgw-mobile-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <CELogo variant="horizontal" height={32} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              style={{ color: 'var(--cgw-muted)', padding: '0.4rem' }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setMobileOpen(false)}
                className={`cgw-nav-link ${activeSection === item.id ? 'is-active' : ''}`}
                style={{ fontSize: '1.1rem', padding: '0.8rem 1rem' }}
              >
                {item.label}
              </a>
            ))}

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--cgw-border)' }}>
              {/* <a
                href="/portal"
                onClick={() => setMobileOpen(false)}
                className="cgw-btn cgw-btn-outline-primary"
                style={{ width: '100%', marginBottom: '0.8rem', padding: '0.75rem' }}
              >
                <LogIn size={16} />
                <span>Staff Portal</span>
              </a> */}

              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="cgw-btn cgw-btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                <span>Get a Quote</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--cgw-muted)', textAlign: 'center', marginTop: 'auto' }}>
            © {new Date().getFullYear()} {company.legalName}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;

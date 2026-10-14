import React from 'react';
import { Phone, Mail, MapPin, ArrowUpRight, LogIn } from 'lucide-react';
import { company, contact, nav, divisions } from '../content';
import { CELogo } from './CELogo';

export const Footer = () => {
  return (
    <footer className="cgw-footer">
      <div className="cgw-container">
        <div className="cgw-footer-grid">
          {/* Column 1: Brand & Legal Entity Info */}
          <div>
            <div style={{ marginBottom: '1.2rem' }}>
              <CELogo variant="horizontal" height={36} color="#2EB8FF" textColor="#FFFFFF" />
            </div>
            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '1.5rem', maxWidth: '340px' }}>
              {company.legalName} is a premier Sri Lankan renewable energy engineering company specializing in utility-scale solar EPC, managed corporate transport, and sustainable agriculture.
            </p>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Circlegroup.lk © 2026 
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="cgw-footer-col-title">Navigation</h4>
            <ul className="cgw-footer-links">
              {nav.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="cgw-footer-link">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Divisions */}
          <div>
            <h4 className="cgw-footer-col-title">Our Divisions</h4>
            <ul className="cgw-footer-links">
              <li>
                <a href="#divisions" className="cgw-footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>Solar Division</span>
                  <ArrowUpRight size={13} />
                </a>
              </li>
              <li>
                <a href="#divisions" className="cgw-footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>Vehicle Division</span>
                  <ArrowUpRight size={13} />
                </a>
              </li>
              <li>
                <a href="#divisions" className="cgw-footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>Plantation Division</span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>Soon</span>
                </a>
              </li>
              <li style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {/* <a href="/portal" className="cgw-footer-link" style={{ color: 'var(--cgw-accent)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <LogIn size={14} />
                  <span>Staff Portal Login</span>
                </a> */}
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Office */}
          <div>
            <h4 className="cgw-footer-col-title">Head Office</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <MapPin size={18} style={{ color: 'var(--cgw-accent)', flexShrink: 0, marginTop: '0.2rem' }} />
                <span>{contact.address}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Phone size={18} style={{ color: 'var(--cgw-accent)', flexShrink: 0 }} />
                <a href={`tel:${contact.phoneHref}`} style={{ color: 'var(--cgw-white)' }}>
                  {contact.phoneDisplay}
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Mail size={18} style={{ color: 'var(--cgw-accent)', flexShrink: 0 }} />
                <a href={`mailto:${contact.email}`} style={{ color: 'var(--cgw-white)' }}>
                  {contact.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="cgw-footer-bottom">
          <div>
            © {new Date().getFullYear()} {company.legalName}. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'rgba(255,255,255,0.5)' }}>
            <a href="#about" style={{ color: 'inherit' }}>Company Profile</a>
            <span>•</span>
            <a href="#divisions" style={{ color: 'inherit' }}>Divisions</a>
            {/* <span>•</span>
            <a href="/portal" style={{ color: 'inherit' }}>Employee Access</a> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

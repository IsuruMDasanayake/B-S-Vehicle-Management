import React, { useState, useEffect } from 'react';
import { ArrowUp, MessageCircle } from 'lucide-react';
import { contact } from '../content';

export const FloatingActions = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalScroll > 0) {
        setScrollProgress((currentScroll / totalScroll) * 100);
      }
      setShowScrollTop(currentScroll > 320);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // SVG circular progress calculation
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div className="cgw-floating-actions" aria-label="Floating quick actions">
      {/* WhatsApp Quick Chat */}
      <a
        href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Hello Circle Engineering, I would like to enquire about your services.')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="cgw-whatsapp-btn"
        title="Chat on WhatsApp"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={26} />
      </a>

      {/* Circular Scroll Progress & Back to Top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="cgw-scroll-top-btn"
          title="Back to top"
          aria-label="Scroll back to top"
        >
          <svg className="cgw-progress-ring" width="50" height="50" viewBox="0 0 50 50">
            {/* Background ring */}
            <circle
              cx="25"
              cy="25"
              r={radius}
              fill="none"
              stroke="var(--cgw-surface)"
              strokeWidth="3.5"
            />
            {/* Dynamic Progress ring matching brand Circle Blue */}
            <circle
              cx="25"
              cy="25"
              r={radius}
              fill="none"
              stroke="var(--cgw-primary)"
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
            />
          </svg>
          <ArrowUp size={18} style={{ position: 'relative', zIndex: 2 }} />
        </button>
      )}
    </div>
  );
};

export default FloatingActions;

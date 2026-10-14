import React, { useState, useEffect } from 'react';
import { CELogo } from './CELogo';

export const IntroLoader = () => {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Only show once per browser session
    const hasSeen = sessionStorage.getItem('cgw_intro_seen');
    if (!hasSeen) {
      setVisible(true);
      const timer1 = setTimeout(() => setFadeOut(true), 750);
      const timer2 = setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem('cgw_intro_seen', 'true');
      }, 1050);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#071A3D',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.2rem',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      <CELogo variant="mark" height={64} color="#2EB8FF" animated={true} />
      <div
        style={{
          fontFamily: '"Clash Display", sans-serif',
          color: '#FFFFFF',
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: 0.9,
        }}
      >
        Circle Engineering
      </div>
    </div>
  );
};

export default IntroLoader;

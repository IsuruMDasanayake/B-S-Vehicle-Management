import React from 'react';
import { company } from '../content';

/**
 * Circle Engineering official logo component.
 * Uses official logo.png / logo-white.png by default for horizontal/full variants,
 * with scalable SVG monogram for mark variant and fallback.
 *
 * @param {string} variant - 'full' | 'mark' | 'horizontal'
 * @param {string} color - primary fill color (default #1046A0 - Circle Blue)
 * @param {string} textColor - text color for 'full'/'horizontal' (default #1A1C20)
 * @param {number} height - pixel height
 * @param {string} className - extra class names
 */
export const CELogo = ({
  variant = 'horizontal',
  color = '#1046A0',
  textColor = '#1A1C20',
  height = 42,
  className = '',
  animated = false,
  useSvg = false,
}) => {
  // Mark aspect ratio: 120 x 80
  const mark = (
    <svg
      viewBox="0 0 120 80"
      height={height}
      className={`cgw-logo-mark ${animated ? 'cgw-logo-animated' : ''}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* The "C" arc */}
      <path
        d="M 60 10 A 30 30 0 1 0 60 70 L 68 70 A 38 38 0 1 1 68 2 L 60 2 Z"
        fill={color}
        className="cgw-logo-c"
      />
      {/* The 3 horizontal bars for "E" */}
      <rect x="60" y="2" width="56" height="15" rx="2" fill={color} className="cgw-logo-bar cgw-logo-bar-1" />
      <rect x="60" y="32.5" width="56" height="15" rx="2" fill={color} className="cgw-logo-bar cgw-logo-bar-2" />
      <rect x="60" y="63" width="56" height="15" rx="2" fill={color} className="cgw-logo-bar cgw-logo-bar-3" />
    </svg>
  );

  if (variant === 'mark') {
    return <span className={`cgw-logo-wrap ${className}`}>{mark}</span>;
  }

  // Official high-resolution logo image
  const isWhite = textColor === '#FFFFFF' || textColor === '#ffffff';
  const logoSrc = isWhite
    ? (company.logoWhiteSrc || '/website/logo-white.png')
    : (company.logoSrc || '/website/logo.png');

  if (!useSvg && logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={company.legalName}
        className={`cgw-logo-img ${className}`}
        style={{
          height: `${height}px`,
          width: 'auto',
          maxWidth: '100%',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    );
  }

  // SVG Fallback
  return (
    <div
      className={`cgw-logo-full ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.75rem',
        textDecoration: 'none',
        lineHeight: 1,
      }}
    >
      {mark}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <div
          style={{
            width: '2px',
            height: `${height * 0.85}px`,
            backgroundColor: color,
            opacity: 0.8,
            borderRadius: '1px',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontFamily: 'var(--cgw-font-display, "Clash Display", sans-serif)',
              fontSize: `${height * 0.44}px`,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: color,
              lineHeight: 1.05,
              textTransform: 'uppercase',
            }}
          >
            Circle
          </span>
          <span
            style={{
              fontFamily: 'var(--cgw-font-display, "Clash Display", sans-serif)',
              fontSize: `${height * 0.28}px`,
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: textColor,
              lineHeight: 1.05,
              textTransform: 'uppercase',
            }}
          >
            Engineering
          </span>
          <span
            style={{
              fontFamily: 'var(--cgw-font-body, "Poppins", sans-serif)',
              fontSize: `${height * 0.16}px`,
              fontWeight: 500,
              letterSpacing: '0.22em',
              color: textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : '#6B7280',
              textTransform: 'uppercase',
              marginTop: '1px',
            }}
          >
            (PVT) LTD
          </span>
        </div>
      </div>
    </div>
  );
};

export default CELogo;

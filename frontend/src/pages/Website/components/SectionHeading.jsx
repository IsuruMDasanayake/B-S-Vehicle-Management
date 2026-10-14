import React from 'react';
import { CELogo } from './CELogo';

export const SectionHeading = ({
  eyebrow,
  title,
  highlight,
  subtitle,
  center = true,
  dark = false,
  className = '',
}) => {
  return (
    <div
      className={`cgw-section-heading ${className}`}
      style={{
        textAlign: center ? 'center' : 'left',
        marginLeft: center ? 'auto' : '0',
        marginRight: center ? 'auto' : '0',
      }}
    >
      {eyebrow && (
        <div style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start', marginBottom: '0.75rem' }}>
          <span className={`cgw-eyebrow ${dark ? 'cgw-eyebrow-accent' : ''}`}>
            <CELogo variant="mark" height={14} color={dark ? '#2EB8FF' : '#1046A0'} />
            {eyebrow}
          </span>
        </div>
      )}

      <h2
        className="cgw-heading-title"
        style={{ color: dark ? 'var(--cgw-white)' : 'var(--cgw-ink)' }}
      >
        {title}{' '}
        {highlight && (
          <span
            className="cgw-highlight"
            style={{ color: dark ? 'var(--cgw-accent)' : 'var(--cgw-primary)' }}
          >
            {highlight}
          </span>
        )}
      </h2>

      {subtitle && (
        <p
          className="cgw-heading-sub"
          style={{ color: dark ? 'rgba(255,255,255,0.75)' : 'var(--cgw-muted)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;

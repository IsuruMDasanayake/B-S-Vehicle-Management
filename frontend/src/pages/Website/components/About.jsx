import React from 'react';
import { Check } from 'lucide-react';
import { about } from '../content';
import { SectionHeading } from './SectionHeading';

export const About = () => {
  return (
    <section id="about" className="cgw-about-section">
      <div className="cgw-container">
        <div className="cgw-about-grid">
          {/* Left: Organic 3-Image Collage */}
          <div className="cgw-about-collage" data-reveal aria-hidden="true">
            <div className="cgw-about-img-1">
              <img src={about.images[0]} alt="Engineering Team" loading="lazy" />
            </div>
            <div className="cgw-about-img-2">
              <img src={about.images[1]} alt="Electrical Engineering" loading="lazy" />
            </div>
            <div className="cgw-about-img-3">
              <img src={about.images[2]} alt="Solar Installation Work" loading="lazy" />
            </div>
          </div>

          {/* Right: Narrative & Quality Assurance Points */}
          <div data-reveal data-delay="150">
            <SectionHeading
              eyebrow={about.eyebrow}
              title={about.title}
              center={false}
            />

            <p style={{ color: 'var(--cgw-muted)', fontSize: '1.02rem', lineHeight: '1.75', marginBottom: '1rem' }}>
              {about.body}
            </p>

            {about.subBody && (
              <p style={{ color: 'var(--cgw-ink)', fontWeight: 500, fontSize: '0.96rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                {about.subBody}
              </p>
            )}

            <div className="cgw-about-feature-box" data-reveal data-delay="250">
              <div className="cgw-about-feature-accent" />
              <ul className="cgw-about-points">
                {about.points.map((pt, idx) => (
                  <li key={idx} className="cgw-about-point">
                    <div className="cgw-about-point-icon">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--cgw-ink)', fontWeight: 600 }}>{pt.title}: </strong>
                      <span style={{ color: 'var(--cgw-muted)', fontSize: '0.94rem' }}>{pt.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

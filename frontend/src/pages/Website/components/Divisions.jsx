import React from 'react';
import { Sun, Truck, Sprout, ArrowRight } from 'lucide-react';
import { divisions } from '../content';
import { SectionHeading } from './SectionHeading';

const iconMap = {
  Sun: Sun,
  Truck: Truck,
  Sprout: Sprout,
};

export const Divisions = () => {
  return (
    <section id="divisions" className="cgw-divisions-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow="Our Divisions"
            title="Integrated Solutions Under"
            highlight="One Name"
            subtitle="From renewable power to corporate logistics and sustainable plantations, Circle Engineering powers progress."
          />
        </div>

        <div className="cgw-divisions-grid">
          {divisions.map((div, idx) => {
            const Icon = iconMap[div.icon] || Sun;
            const isSoon = div.status === 'soon';
            const delay = (idx + 1) * 100;

            return (
              <div
                key={div.id}
                className="cgw-division-card"
                data-reveal
                data-delay={String(delay)}
                style={{ borderTop: `4px solid ${div.accent}` }}
              >
                {/* Media Header */}
                <div className="cgw-division-media">
                  <img src={div.image} alt={div.name} className="cgw-division-img" loading="lazy" />
                  <div className="cgw-division-badge" style={{ color: div.accent }}>
                    <Icon size={14} />
                    <span>{div.tag}</span>
                  </div>
                  {isSoon && (
                    <div className="cgw-division-status">
                      Coming Soon
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="cgw-division-body">
                  <h3 className="cgw-division-title">
                    <span>{div.name}</span>
                  </h3>

                  <p className="cgw-division-desc">
                    {div.description}
                  </p>

                  {/* Services Chips */}
                  <div className="cgw-division-services">
                    {div.services.map((svc, i) => (
                      <span key={i} className="cgw-service-chip">
                        {svc}
                      </span>
                    ))}
                  </div>

                  {/* Key Metrics / Highlights */}
                  {div.facts && div.facts.length > 0 && (
                    <div className="cgw-division-facts">
                      {div.facts.map((f, i) => (
                        <div key={i}>
                          <div className="cgw-division-fact-val" style={{ color: div.accent }}>{f.value}</div>
                          <div className="cgw-division-fact-lbl">{f.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA Button */}
                  <a
                    href={div.cta.href}
                    className="cgw-btn"
                    style={{
                      marginTop: 'auto',
                      backgroundColor: isSoon ? 'var(--cgw-surface)' : div.accent,
                      color: isSoon ? 'var(--cgw-ink)' : '#FFFFFF',
                      width: '100%',
                      justifyContent: 'space-between',
                      border: isSoon ? '1px solid var(--cgw-border)' : 'none',
                    }}
                  >
                    <span>{div.cta.label}</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Divisions;

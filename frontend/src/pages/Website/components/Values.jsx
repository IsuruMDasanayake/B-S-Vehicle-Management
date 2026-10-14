import React from 'react';
import { ShieldCheck, Award, Lightbulb, Handshake, Leaf, Users } from 'lucide-react';
import { values } from '../content';
import { SectionHeading } from './SectionHeading';

const iconMap = {
  ShieldCheck,
  Award,
  Lightbulb,
  Handshake,
  Leaf,
  Users,
};

export const Values = () => {
  return (
    <section id="values" className="cgw-values-section">
      {/* Background Half-Band */}
      <div className="cgw-values-bg-band">
        <img src={values.image} alt="Values Background" className="cgw-values-bg-img" loading="lazy" />
        <div className="cgw-values-bg-overlay" />
      </div>

      <div className="cgw-container cgw-values-content">
        <div data-reveal>
          <SectionHeading
            eyebrow={values.eyebrow}
            title="The Principles That Drive Our"
            highlight="Excellence"
            subtitle={values.title}
            dark={true}
          />
        </div>

        <div className="cgw-values-grid">
          {values.items.map((item, idx) => {
            const Icon = iconMap[item.icon] || ShieldCheck;
            const delay = (idx % 3 + 1) * 100;
            return (
              <div
                key={idx}
                className="cgw-value-card"
                data-reveal
                data-delay={String(delay)}
              >
                <div className="cgw-value-icon">
                  <Icon size={24} />
                </div>
                <h3 className="cgw-value-title">{item.title}</h3>
                <p className="cgw-value-desc">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Values;

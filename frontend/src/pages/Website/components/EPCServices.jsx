import React from 'react';
import { PencilRuler, Boxes, HardHat, Gauge, Activity, ShieldCheck, Check } from 'lucide-react';
import { epcServices } from '../content';
import { SectionHeading } from './SectionHeading';

const iconMap = {
  PencilRuler,
  Boxes,
  HardHat,
  Gauge,
  Activity,
  ShieldCheck,
};

export const EPCServices = () => {
  return (
    <section id="services" className="cgw-epc-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow={epcServices.eyebrow}
            title="Integrated EPC Delivery For"
            highlight="Renewable Energy"
            subtitle={epcServices.subtitle}
          />
        </div>

        <div className="cgw-epc-grid">
          {epcServices.services.map((svc, idx) => {
            const Icon = iconMap[svc.icon] || ShieldCheck;
            const delay = ((idx % 3) + 1) * 100;

            return (
              <div
                key={svc.number}
                className="cgw-epc-card"
                data-reveal
                data-delay={String(delay)}
              >
                <div className="cgw-epc-card-top">
                  <div className="cgw-epc-icon">
                    <Icon size={24} />
                  </div>
                  <span className="cgw-epc-number">{svc.number}</span>
                </div>

                <h3 className="cgw-epc-title">{svc.title}</h3>
                <p className="cgw-epc-desc">{svc.desc}</p>

                <ul className="cgw-epc-features">
                  {svc.features.map((feat, i) => (
                    <li key={i} className="cgw-epc-feature-item">
                      <span className="cgw-epc-check">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EPCServices;

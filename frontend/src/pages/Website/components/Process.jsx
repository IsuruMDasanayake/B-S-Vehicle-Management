import React from 'react';
import { Headset, PencilRuler, HardHat, Activity } from 'lucide-react';
import { process } from '../content';
import { SectionHeading } from './SectionHeading';

const iconMap = {
  Headset,
  PencilRuler,
  HardHat,
  Activity,
};

export const Process = () => {
  return (
    <section id="process" className="cgw-process-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow={process.eyebrow}
            title="From Concept to Delivery,"
            highlight="Full Circle"
            subtitle="A methodical engineering approach guaranteeing timeline, safety and peak performance."
          />
        </div>

        <div className="cgw-process-grid">
          {process.steps.map((step, idx) => {
            const Icon = iconMap[step.icon] || Activity;
            const stepNum = String(idx + 1).padStart(2, '0');
            const delay = (idx + 1) * 100;

            return (
              <div
                key={idx}
                className="cgw-process-card"
                data-reveal
                data-delay={String(delay)}
              >
                <span className="cgw-process-number">{stepNum}</span>
                <div className="cgw-process-icon">
                  <Icon size={28} />
                </div>
                <h3 className="cgw-process-title">{step.title}</h3>
                <p className="cgw-process-desc">{step.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Process;

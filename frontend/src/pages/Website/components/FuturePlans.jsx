import React from 'react';
import { Target, Cpu, TrendingUp, Network, Award } from 'lucide-react';
import { futurePlans } from '../content';
import { SectionHeading } from './SectionHeading';

const planIcons = [
  TrendingUp,
  Cpu,
  Target,
  Network,
  Award,
];

export const FuturePlans = () => {
  return (
    <section id="roadmap" className="cgw-plans-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow={futurePlans.eyebrow}
            title="Strategic Priorities For"
            highlight="Long-Term Growth"
            subtitle={futurePlans.subtitle}
          />
        </div>

        <div className="cgw-plans-grid">
          {futurePlans.items.map((plan, idx) => {
            const Icon = planIcons[idx % planIcons.length] || Target;
            const delay = ((idx % 3) + 1) * 100;

            return (
              <div
                key={plan.number}
                className="cgw-plan-card"
                data-reveal
                data-delay={String(delay)}
              >
                <div className="cgw-plan-top">
                  <span className="cgw-plan-num">{plan.number}</span>
                  <div className="cgw-plan-icon">
                    <Icon size={20} />
                  </div>
                </div>

                <h3 className="cgw-plan-title">{plan.title}</h3>
                <p className="cgw-plan-desc">{plan.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FuturePlans;

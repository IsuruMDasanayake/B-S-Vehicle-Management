import React from 'react';
import { Handshake, Building, Award, ShieldCheck } from 'lucide-react';
import { clients } from '../content';
import { SectionHeading } from './SectionHeading';

export const Clients = () => {
  return (
    <section id="clients" className="cgw-clients-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow={clients.eyebrow}
            title="Clients &"
            highlight="Collaborations"
            subtitle={clients.subtitle}
          />
        </div>

        <div className="cgw-clients-grid" data-reveal data-delay="100">
          {clients.list.map((client, idx) => {
            const delay = ((idx % 3) + 1) * 100;
            return (
              <div
                key={idx}
                className="cgw-client-card"
                data-reveal
                data-delay={String(delay)}
              >
                <div className="cgw-client-icon">
                  <Building size={22} />
                </div>
                <div className="cgw-client-details">
                  <h4 className="cgw-client-name">{client.name}</h4>
                  <span className="cgw-client-type">{client.type}</span>
                </div>
                <div className="cgw-client-trust-badge" title="Verified Collaboration">
                  <ShieldCheck size={16} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Engineering Trust Banner */}
        <div className="cgw-clients-trust-banner" data-reveal data-delay="200">
          <div className="cgw-trust-metric">
            <span className="cgw-trust-val">100%</span>
            <span className="cgw-trust-lbl">On-Schedule Handover</span>
          </div>
          <div className="cgw-trust-divider" />
          <div className="cgw-trust-metric">
            <span className="cgw-trust-val">Tier-1</span>
            <span className="cgw-trust-lbl">Equipment Certified</span>
          </div>
          <div className="cgw-trust-divider" />
          <div className="cgw-trust-metric">
            <span className="cgw-trust-val">CEB / LECO</span>
            <span className="cgw-trust-lbl">Grid Code Compliant</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Clients;

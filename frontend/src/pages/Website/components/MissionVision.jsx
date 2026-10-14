import React from 'react';
import { Target, Compass, Check } from 'lucide-react';
import { missionVision } from '../content';
import { SectionHeading } from './SectionHeading';

const missionPillars = [
  'Turnkey renewable energy and corporate fleet solutions with certified reliability.',
  'Zero-compromise safety protocols and strict engineering quality controls.',
  'Long-term client value, verified energy savings and dedicated after-sales support.',
];

const visionPillars = [
  "To be Sri Lanka's leading and most trusted multi-disciplinary engineering group.",
  'Pioneering smart solar tracking, IoT telemetry and sustainable infrastructure.',
  'Empowering communities and industries with clean, full-circle technology.',
];

export const MissionVision = () => {
  return (
    <section id="mission-vision" className="cgw-mv-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow={missionVision.eyebrow}
            title="Purpose-Driven"
            highlight="Engineering"
            subtitle={missionVision.intro}
          />
        </div>

        <div className="cgw-mv-grid">
          {/* Card 1: Vision */}
          <div className="cgw-mv-card is-vision" data-reveal data-delay="100">
            <div className="cgw-mv-media">
              <img
                src={missionVision.items[0]?.image || '/website/project-naula.jpg'}
                alt="Circle Engineering Vision"
                className="cgw-mv-image"
                loading="lazy"
              />
              <div className="cgw-mv-badge is-vision">
                <Compass size={15} />
                <span>{missionVision.items[0]?.title}</span>
              </div>
            </div>

            <div className="cgw-mv-body">
              <h3 className="cgw-mv-title">Driving Sri Lanka's Energy Future</h3>
              <p className="cgw-mv-text">
                {missionVision.items[0]?.text}
              </p>

              <ul className="cgw-mv-pillars">
                {visionPillars.map((pillar, idx) => (
                  <li key={idx} className="cgw-mv-pillar-item">
                    <span className="cgw-mv-pillar-icon" style={{ background: 'rgba(46, 184, 255, 0.15)', color: '#0284C7' }}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{pillar}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 2: Mission */}
          <div className="cgw-mv-card is-mission" data-reveal data-delay="200">
            <div className="cgw-mv-media">
              <img
                src={missionVision.items[1]?.image || '/website/project-hambantota.jpg'}
                alt="Circle Engineering Mission"
                className="cgw-mv-image"
                loading="lazy"
              />
              <div className="cgw-mv-badge is-mission">
                <Target size={15} />
                <span>{missionVision.items[1]?.title}</span>
              </div>
            </div>

            <div className="cgw-mv-body">
              <h3 className="cgw-mv-title">High-Quality, Innovative EPC Delivery</h3>
              <p className="cgw-mv-text">
                {missionVision.items[1]?.text}
              </p>

              <ul className="cgw-mv-pillars">
                {missionPillars.map((pillar, idx) => (
                  <li key={idx} className="cgw-mv-pillar-item">
                    <span className="cgw-mv-pillar-icon">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{pillar}</span>
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

export default MissionVision;

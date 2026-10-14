import React, { useState } from 'react';
import { Zap, MapPin, CheckCircle2, Clock, ArrowRight, ExternalLink, X } from 'lucide-react';
import { portfolio } from '../content';
import { SectionHeading } from './SectionHeading';

export const ProjectPortfolio = () => {
  const [activeModalProject, setActiveModalProject] = useState(null);

  return (
    <section id="portfolio" className="cgw-portfolio-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow={portfolio.eyebrow}
            title="Utility & Enterprise"
            highlight="Project Portfolio"
            subtitle={portfolio.subtitle}
          />
        </div>

        {/* 3 Major Landmark Projects */}
        <div className="cgw-portfolio-flagships">
          {portfolio.flagships.map((proj, idx) => {
            const isCompleted = proj.statusType === 'completed';
            const delay = (idx + 1) * 100;

            return (
              <div
                key={proj.id}
                className="cgw-flagship-card"
                data-reveal
                data-delay={String(delay)}
              >
                {/* Media Image */}
                <div
                  className="cgw-flagship-media"
                  onClick={() => setActiveModalProject(proj)}
                  title="Click to view full image"
                >
                  <img src={proj.image} alt={proj.name} className="cgw-flagship-img" loading="lazy" />
                  <div className="cgw-flagship-overlay-badge">
                    <span className={`cgw-status-pill ${isCompleted ? 'is-completed' : 'is-ongoing'}`}>
                      {isCompleted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                      <span>{proj.status}</span>
                    </span>
                    <span className="cgw-capacity-pill">
                      <Zap size={13} />
                      <span>{proj.capacity}</span>
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="cgw-flagship-body">
                  <div className="cgw-flagship-loc">
                    <MapPin size={14} style={{ color: 'var(--cgw-primary)' }} />
                    <span>{proj.location}</span>
                  </div>

                  <h3 className="cgw-flagship-name">{proj.name}</h3>
                  <p className="cgw-flagship-desc">{proj.description}</p>

                  <div className="cgw-flagship-metrics">
                    {proj.metrics.map((m, i) => (
                      <div key={i} className="cgw-flagship-metric-item">
                        <span className="cgw-flagship-metric-lbl">{m.label}</span>
                        <span className="cgw-flagship-metric-val">{m.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Collaborative Projects Track Record (Page 8 of PDF) */}
        <div className="cgw-collab-section" data-reveal data-delay="200">
          <div className="cgw-collab-header">
            <div>
              <span className="cgw-eyebrow">Proven Experience</span>
              <h3 className="cgw-collab-title">Collaborative Solar Projects</h3>
              <p className="cgw-collab-subtitle">
                Demonstrated multi-megawatt track record across utility-scale and enterprise installations in Sri Lanka.
              </p>
            </div>
            <div className="cgw-collab-total-badge">
              <span className="cgw-collab-total-num">21+ MW</span>
              <span className="cgw-collab-total-lbl">Collaborative Total</span>
            </div>
          </div>

          <div className="cgw-collab-grid">
            {portfolio.collaborations.map((item, idx) => (
              <div key={idx} className="cgw-collab-item">
                <div className="cgw-collab-icon">
                  <Zap size={18} />
                </div>
                <div className="cgw-collab-info">
                  <div className="cgw-collab-client">{item.client}</div>
                  <div className="cgw-collab-cat">{item.category}</div>
                </div>
                <div className="cgw-collab-cap-tag">
                  {item.capacity}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeModalProject && (
        <div className="cgw-lightbox" onClick={() => setActiveModalProject(null)}>
          <div className="cgw-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cgw-lightbox-close"
              onClick={() => setActiveModalProject(null)}
              aria-label="Close image modal"
            >
              <X size={28} />
            </button>
            <img src={activeModalProject.image} alt={activeModalProject.name} className="cgw-lightbox-img" />
            <div style={{ color: 'var(--cgw-white)', marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span className="cgw-capacity-pill">
                  <Zap size={13} />
                  <span>{activeModalProject.capacity}</span>
                </span>
                <span style={{ color: 'var(--cgw-accent)', fontSize: '0.82rem', fontWeight: 600 }}>
                  {activeModalProject.status}
                </span>
              </div>
              <h3 style={{ color: 'var(--cgw-white)', fontSize: '1.4rem' }}>{activeModalProject.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
                {activeModalProject.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectPortfolio;

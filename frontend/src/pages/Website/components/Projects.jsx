import React, { useState, useEffect } from 'react';
import { X, MapPin, Maximize2 } from 'lucide-react';
import { projects } from '../content';
import { SectionHeading } from './SectionHeading';

export const Projects = () => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeImage, setActiveImage] = useState(null);

  const filteredProjects = activeFilter === 'All'
    ? projects.items
    : projects.items.filter((p) => p.category === activeFilter);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveImage(null);
    };
    if (activeImage) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeImage]);

  return (
    <section id="projects" className="cgw-projects-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow={projects.eyebrow}
            title={projects.title}
            subtitle={projects.intro}
          />
        </div>

        {/* Filter Chips */}
        <div className="cgw-projects-filter" data-reveal data-delay="100">
          {projects.filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`cgw-filter-btn ${activeFilter === filter ? 'is-active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="cgw-projects-grid">
          {filteredProjects.map((p, idx) => {
            const cardClass = p.size === 'wide' ? 'is-wide' : p.size === 'tall' ? 'is-tall' : '';
            const delay = ((idx % 3) + 1) * 100;
            return (
              <div
                key={idx}
                className={`cgw-project-card ${cardClass}`}
                data-reveal
                data-delay={String(delay)}
                onClick={() => setActiveImage(p)}
              >
                <img src={p.image} alt={p.title} className="cgw-project-img" loading="lazy" />
                <div className="cgw-project-overlay">
                  <span className="cgw-project-badge">{p.category}</span>
                  <h4 className="cgw-project-title">{p.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
                    <MapPin size={14} style={{ color: 'var(--cgw-accent)' }} />
                    <span className="cgw-project-loc">{p.location}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeImage && (
        <div className="cgw-lightbox" onClick={() => setActiveImage(null)}>
          <div className="cgw-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cgw-lightbox-close"
              onClick={() => setActiveImage(null)}
              aria-label="Close image modal"
            >
              <X size={32} />
            </button>
            <img src={activeImage.image} alt={activeImage.title} className="cgw-lightbox-img" />
            <div style={{ color: 'var(--cgw-white)', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: 'var(--cgw-accent)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  {activeImage.category}
                </span>
                <h3 style={{ color: 'var(--cgw-white)', fontSize: '1.35rem' }}>{activeImage.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{activeImage.location}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Projects;

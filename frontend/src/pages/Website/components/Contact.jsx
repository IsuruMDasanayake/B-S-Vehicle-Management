import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, CheckCircle } from 'lucide-react';
import { contact, interests, company } from '../content';
import { SectionHeading } from './SectionHeading';

export const Contact = ({ initialInterest = '' }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    interest: 'Solar Division (Utility EPC & C&I)',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (initialInterest) {
      setFormData((prev) => ({
        ...prev,
        interest: initialInterest.includes('MW') || initialInterest.includes('kW')
          ? 'Solar Division (Utility EPC & C&I)'
          : initialInterest,
        message: initialInterest.includes('MW') || initialInterest.includes('kW')
          ? `I am interested in ${initialInterest}. Please provide project feasibility details and technical proposal.`
          : prev.message,
      }));
    }
  }, [initialInterest]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleWhatsAppSubmit = (e) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hello ${company.shortName},\n\n` +
      `My name is ${formData.name || 'a client'}.\n` +
      `Phone: ${formData.phone || 'N/A'}\n` +
      `Email: ${formData.email || 'N/A'}\n` +
      `Division: ${formData.interest}\n\n` +
      `Enquiry:\n${formData.message || 'I would like to enquire about your services.'}`
    );
    window.open(`https://wa.me/${contact.whatsapp}?text=${text}`, '_blank');
    setSubmitted(true);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Website Enquiry - ${formData.interest} - ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\n` +
      `Phone: ${formData.phone}\n` +
      `Email: ${formData.email}\n` +
      `Division / Interest: ${formData.interest}\n\n` +
      `Message:\n${formData.message}`
    );
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <section id="contact" className="cgw-contact-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow="Get In Touch"
            title="Start Your Project With"
            highlight="Circle Engineering"
            subtitle="Speak with our engineers today for a tailored solar quotation, transport proposal or site visit."
          />
        </div>

        <div className="cgw-contact-grid">
          {/* Left: Contact Info Cards */}
          <div className="cgw-contact-info-cards" data-reveal data-delay="100">
            <div className="cgw-contact-info-card">
              <div className="cgw-contact-icon">
                <Phone size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>Call Us Directly</h4>
                <a href={`tel:${contact.phoneHref}`} style={{ color: 'var(--cgw-primary)', fontWeight: 600, fontSize: '1.05rem' }}>
                  {contact.phoneDisplay}
                </a>
                <p style={{ color: 'var(--cgw-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  Direct line to our engineering sales desk
                </p>
              </div>
            </div>

            <div className="cgw-contact-info-card">
              <div className="cgw-contact-icon">
                <Mail size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>Email Enquiries</h4>
                <a href={`mailto:${contact.email}`} style={{ color: 'var(--cgw-primary)', fontWeight: 600, fontSize: '1.05rem' }}>
                  {contact.email}
                </a>
                <p style={{ color: 'var(--cgw-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  We reply within 24 business hours
                </p>
              </div>
            </div>

            <div className="cgw-contact-info-card">
              <div className="cgw-contact-icon">
                <MapPin size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>Head Office</h4>
                <div style={{ color: 'var(--cgw-ink)', fontWeight: 500, fontSize: '0.98rem' }}>
                  {contact.address}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--cgw-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  <Clock size={13} />
                  <span>{contact.hours}</span>
                </div>
              </div>
            </div>

            {/* Google Map Embed */}
            <div style={{ borderRadius: 'var(--cgw-radius-lg)', overflow: 'hidden', height: '200px', border: '1px solid var(--cgw-border)', marginTop: '0.5rem' }}>
              <iframe
                title="Office Location Map"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(contact.mapQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          </div>

          {/* Right: Quick Action Contact Form */}
          <div className="cgw-contact-form-wrap" data-reveal data-delay="200">
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--cgw-ink)' }}>
              Request a Free Consultation
            </h3>
            <p style={{ color: 'var(--cgw-muted)', fontSize: '0.9rem', marginBottom: '1.8rem' }}>
              Fill in your details below and choose to send directly via WhatsApp or standard Email.
            </p>

            <form onSubmit={handleWhatsAppSubmit}>
              <div className="cgw-form-grid">
                <div className="cgw-form-group">
                  <label className="cgw-label" htmlFor="cgw-name">Your Full Name *</label>
                  <input
                    id="cgw-name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Kasun Perera"
                    value={formData.name}
                    onChange={handleChange}
                    className="cgw-input"
                  />
                </div>

                <div className="cgw-form-group">
                  <label className="cgw-label" htmlFor="cgw-phone">Phone / WhatsApp *</label>
                  <input
                    id="cgw-phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="e.g. 077 123 4567"
                    value={formData.phone}
                    onChange={handleChange}
                    className="cgw-input"
                  />
                </div>

                <div className="cgw-form-group">
                  <label className="cgw-label" htmlFor="cgw-email">Email Address</label>
                  <input
                    id="cgw-email"
                    name="email"
                    type="email"
                    placeholder="name@domain.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="cgw-input"
                  />
                </div>

                <div className="cgw-form-group">
                  <label className="cgw-label" htmlFor="cgw-interest">Division of Interest</label>
                  <select
                    id="cgw-interest"
                    name="interest"
                    value={formData.interest}
                    onChange={handleChange}
                    className="cgw-select"
                  >
                    {interests.map((int) => (
                      <option key={int} value={int}>{int}</option>
                    ))}
                  </select>
                </div>

                <div className="cgw-form-group is-full">
                  <label className="cgw-label" htmlFor="cgw-message">Project Details / Message</label>
                  <textarea
                    id="cgw-message"
                    name="message"
                    rows={4}
                    placeholder="Tell us about your roof area, location, fleet requirements, or questions..."
                    value={formData.message}
                    onChange={handleChange}
                    className="cgw-textarea"
                  />
                </div>
              </div>

              {submitted && (
                <div style={{ background: '#ECFDF5', color: '#065F46', padding: '0.8rem 1rem', borderRadius: '8px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem', border: '1px solid #A7F3D0' }}>
                  <CheckCircle size={18} />
                  <span>Enquiry created! Your messaging app or email client has been launched.</span>
                </div>
              )}

              {/* Action Buttons: WhatsApp and Email */}
              <div className="cgw-form-actions">
                <button
                  type="button"
                  onClick={handleWhatsAppSubmit}
                  className="cgw-btn"
                  style={{
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    flex: 1,
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <MessageCircle size={18} />
                  <span>Send via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleEmailSubmit}
                  className="cgw-btn cgw-btn-primary"
                  style={{
                    backgroundColor: '#1046A0',
                    color: '#FFFFFF',
                    flex: 1,
                    boxShadow: '0 4px 14px rgba(16, 70, 160, 0.3)',
                  }}
                >
                  <Mail size={18} />
                  <span>Send via Email</span>
                </button>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--cgw-muted)', marginTop: '0.9rem' }}>
                We respect your privacy. Your information is strictly used for your engineering enquiry.
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;

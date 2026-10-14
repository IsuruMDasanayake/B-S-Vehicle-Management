import React, { useState } from 'react';
import { Calculator, ArrowRight, Factory, Building2, Warehouse, Hotel, Zap, ShieldCheck, Trees } from 'lucide-react';
import { solarCalc } from '../content';
import { SectionHeading } from './SectionHeading';

const facilityIcons = {
  factory: Factory,
  commercial: Building2,
  warehouse: Warehouse,
  hospitality: Hotel,
  utility: Zap,
};

export const SolarCalculator = ({ onSelectQuote }) => {
  const [bill, setBill] = useState(solarCalc.defaultBill); // LKR 1,500,000 default
  const [facilityType, setFacilityType] = useState('factory');
  const [systemType, setSystemType] = useState('ongrid'); // 'ongrid' | 'hybrid'

  // Calculations based on Sri Lanka Commercial & Industrial Tariffs
  const unitsNeeded = bill / solarCalc.avgTariff;
  const rawKw = unitsNeeded / solarCalc.yieldPerKw;
  // Sized to nearest 5 kWp for enterprise scale, minimum 25 kWp
  const kwCapacity = Math.max(25, Math.round(rawKw / 5) * 5);
  const isMegawatt = kwCapacity >= 1000;
  const capacityDisplay = isMegawatt
    ? `${(kwCapacity / 1000).toFixed(2)} MWp`
    : `${kwCapacity} kWp`;

  const panelCount = Math.ceil((kwCapacity * 1000) / solarCalc.panelWatt);
  const roofAreaM2 = Math.round(panelCount * solarCalc.panelArea);
  const roofAreaSqft = Math.round(roofAreaM2 * 10.764);
  const roofAreaAcres = (roofAreaSqft / 43560).toFixed(2);
  const annualGenerationMwh = Math.round((kwCapacity * solarCalc.yieldPerKw * 12) / 1000);

  // Enterprise operational savings (approx 94% bill offset)
  const monthlySavings = Math.round(bill * 0.94);
  const annualSavings = monthlySavings * 12;

  const costPerKw = systemType === 'ongrid' ? solarCalc.costPerKw.ongrid : solarCalc.costPerKw.hybrid;
  const approxSystemCost = Math.round(kwCapacity * costPerKw);
  const paybackYears = (approxSystemCost / annualSavings).toFixed(1);

  const co2OffsetTons = Math.round((unitsNeeded * 12 * solarCalc.gridEmission) / 1000);
  const treesEquiv = Math.round((unitsNeeded * 12 * solarCalc.gridEmission) / solarCalc.treeAbsorption);

  const selectedFacilityObj = solarCalc.facilityTypes.find((f) => f.id === facilityType) || solarCalc.facilityTypes[0];

  const handleGetQuote = () => {
    const summary = `${capacityDisplay} Enterprise Solar for ${selectedFacilityObj.name} (${systemType === 'ongrid' ? 'Grid-Tie Net Accounting' : 'Hybrid + BESS Storage'}, Monthly Bill: LKR ${bill.toLocaleString()})`;
    if (onSelectQuote) {
      onSelectQuote(summary);
    }
    const contactElem = document.getElementById('contact');
    if (contactElem) {
      contactElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="calculator" className="cgw-calc-section">
      <div className="cgw-container">
        <div data-reveal>
          <SectionHeading
            eyebrow="Commercial & Industrial Energy"
            title="Enterprise Solar"
            highlight="ROI Estimator"
            subtitle="Tailored for factories, commercial towers, and industrial estates seeking megawatt-scale operational savings, high-voltage grid tie-in, and rapid capital recovery."
          />
        </div>

        <div className="cgw-calc-card" data-reveal data-delay="150">
          {/* Left: Input Slider & System Selection */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cgw-accent)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.8rem' }}>
              <Calculator size={18} />
              <span>C&I Engineering Feasibility Model</span>
            </div>

            <h3 style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.1rem)', color: 'var(--cgw-white)', marginBottom: '0.6rem' }}>
              Monthly Electricity Expenditure
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.92rem', marginBottom: '1.6rem' }}>
              Select facility type and monthly CEB / LECO electricity bill to model capital ROI and system scale.
            </p>

            {/* Facility Type Selector */}
            <div style={{ marginBottom: '1.6rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem', fontWeight: 600 }}>
                Enterprise Facility Type:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {solarCalc.facilityTypes.map((ft) => {
                  const Icon = facilityIcons[ft.id] || Factory;
                  const isActive = facilityType === ft.id;
                  return (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => setFacilityType(ft.id)}
                      style={{
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: isActive ? 'var(--cgw-accent)' : 'rgba(255,255,255,0.06)',
                        color: isActive ? 'var(--cgw-navy-dark)' : 'var(--cgw-white)',
                        border: isActive ? '1px solid var(--cgw-accent)' : '1px solid rgba(255,255,255,0.12)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Icon size={14} />
                      <span>{ft.name.split('&')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Bill Display */}
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.2rem 1.6rem', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '1.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Average Monthly CEB Bill
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--cgw-accent)', fontWeight: 600 }}>
                  ~LKR {(bill / 1000000).toFixed(2)}M / mo
                </span>
              </div>
              <div style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', fontWeight: 700, color: 'var(--cgw-white)', fontFamily: 'var(--cgw-font-display)', marginTop: '0.2rem' }}>
                LKR {bill.toLocaleString()}
              </div>
            </div>

            {/* Slider */}
            <div className="cgw-calc-slider-wrap">
              <input
                type="range"
                min={solarCalc.minBill}
                max={solarCalc.maxBill}
                step={50000}
                value={bill}
                onChange={(e) => setBill(Number(e.target.value))}
                className="cgw-calc-slider"
                aria-label="Monthly enterprise electricity bill in LKR"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
                <span>LKR 150K (C&I Entry)</span>
                <span>LKR 5.0M</span>
                <span>LKR 15.0M+ (Utility Scale)</span>
              </div>
            </div>

            {/* Quick Enterprise Bill Presets */}
            <div style={{ marginTop: '1.2rem' }}>
              <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.45rem' }}>
                Enterprise Scale Presets:
              </div>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                {[
                  { label: '350K', val: 350000 },
                  { label: '750K', val: 750000 },
                  { label: '1.5M', val: 1500000 },
                  { label: '3.5M', val: 3500000 },
                  { label: '7.5M', val: 7500000 },
                  { label: '12M+', val: 12000000 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setBill(preset.val)}
                    style={{
                      background: bill === preset.val ? 'var(--cgw-accent)' : 'rgba(255,255,255,0.08)',
                      color: bill === preset.val ? 'var(--cgw-navy-dark)' : 'var(--cgw-white)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    LKR {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* System Architecture Toggle */}
            <div style={{ marginTop: '1.8rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontWeight: 600 }}>
                System Architecture:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.7rem' }}>
                <button
                  type="button"
                  onClick={() => setSystemType('ongrid')}
                  style={{
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    background: systemType === 'ongrid' ? 'rgba(16, 70, 160, 0.45)' : 'rgba(255,255,255,0.06)',
                    color: 'var(--cgw-white)',
                    border: systemType === 'ongrid' ? '2px solid var(--cgw-accent)' : '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--cgw-white)' }}>Grid-Tie (Net Accounting)</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.15rem' }}>CEB Medium / HT Interconnection</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSystemType('hybrid')}
                  style={{
                    padding: '0.7rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    background: systemType === 'hybrid' ? 'rgba(16, 70, 160, 0.45)' : 'rgba(255,255,255,0.06)',
                    color: 'var(--cgw-white)',
                    border: systemType === 'hybrid' ? '2px solid var(--cgw-accent)' : '1px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--cgw-white)' }}>Industrial Microgrid + BESS</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.15rem' }}>BESS Storage & Diesel Generator Offset</div>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Calculated Metrics & Call to Action */}
          <div className="cgw-calc-results">
            <div className="cgw-calc-result-main">
              <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Projected Annual Operational Savings
              </div>
              <div className="cgw-calc-savings-number">
                LKR ~{(annualSavings / 1000000).toFixed(1)} Million
              </div>
              <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.3rem' }}>
                Monthly savings: LKR ~{(monthlySavings / 1000000).toFixed(2)}M / month (~94% bill offset)
              </div>
            </div>

            <div className="cgw-calc-metrics">
              <div className="cgw-calc-metric-box">
                <div className="cgw-calc-metric-val">{capacityDisplay}</div>
                <div className="cgw-calc-metric-lbl">Recommended Capacity</div>
              </div>
              <div className="cgw-calc-metric-box">
                <div className="cgw-calc-metric-val">~{annualGenerationMwh} MWh/yr</div>
                <div className="cgw-calc-metric-lbl">Clean Annual Generation</div>
              </div>
              <div className="cgw-calc-metric-box">
                <div className="cgw-calc-metric-val">{panelCount.toLocaleString()} Modules</div>
                <div className="cgw-calc-metric-lbl">Tier-1 580W TOPCon Panels</div>
              </div>
              <div className="cgw-calc-metric-box">
                <div className="cgw-calc-metric-val">~{paybackYears} Years</div>
                <div className="cgw-calc-metric-lbl">Capital Payback Period</div>
              </div>
              <div className="cgw-calc-metric-box">
                <div className="cgw-calc-metric-val">~{roofAreaSqft.toLocaleString()} sq.ft</div>
                <div className="cgw-calc-metric-lbl">Footprint ({roofAreaAcres} Acres)</div>
              </div>
              <div className="cgw-calc-metric-box">
                <div className="cgw-calc-metric-val">~{co2OffsetTons} Tons/yr</div>
                <div className="cgw-calc-metric-lbl">Scope 2 Carbon Abatement</div>
              </div>
            </div>

            {/* High Voltage Grid Tie Notice */}
            <div style={{ background: 'rgba(16, 70, 160, 0.25)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.4rem', border: '1px solid rgba(46, 184, 255, 0.25)' }}>
              <ShieldCheck size={20} style={{ color: 'var(--cgw-accent)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                <strong>CEB / LECO High-Voltage Interconnection:</strong> Complete turnkey scope including step-up substation (11kV / 33kV), surge protection, CEB grid synchronization, and 24/7 cloud SCADA monitoring.
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetQuote}
              className="cgw-btn cgw-btn-accent"
              style={{ width: '100%', padding: '0.95rem', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700 }}
            >
              <span>Request Industrial Site Audit & Feasibility Study</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.75rem' }}>
              * High-level engineering feasibility estimates based on Sri Lanka CEB Industrial Tariff schedules. Formal site audit required for structural load, HT substation proximity, and shading analysis.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolarCalculator;

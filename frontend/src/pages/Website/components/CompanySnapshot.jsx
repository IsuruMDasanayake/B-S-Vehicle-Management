import React from 'react';
import { Building2, FileText, Zap, MapPin, Users, Award, ShieldCheck } from 'lucide-react';
import { snapshot, company } from '../content';

export const CompanySnapshot = () => {
  return (
    <section className="cgw-snapshot-section" data-reveal>
      <div className="cgw-container">
        <div className="cgw-snapshot-card">
          <div className="cgw-snapshot-header">
            <div>
              <div className="cgw-snapshot-badge">
                <ShieldCheck size={14} />
                <span>Official Corporate Snapshot</span>
              </div>
              <h2 className="cgw-snapshot-title">{snapshot.companyName}</h2>
              <p className="cgw-snapshot-tagline">
                {snapshot.tagline}
              </p>
            </div>
            {/* <div className="cgw-snapshot-reg-pill">
              <span className="cgw-snapshot-reg-label">ROC Sri Lanka</span>
              <span className="cgw-snapshot-reg-num">{snapshot.regNo}</span>
            </div> */}
          </div>

          <div className="cgw-snapshot-grid">
            <div className="cgw-snapshot-item">
              <div className="cgw-snapshot-icon">
                <Building2 size={20} />
              </div>
              <div>
                <div className="cgw-snapshot-lbl">Head Office</div>
                <div className="cgw-snapshot-val">{snapshot.headOffice}</div>
              </div>
            </div>

            <div className="cgw-snapshot-item">
              <div className="cgw-snapshot-icon">
                <Zap size={20} />
              </div>
              <div>
                <div className="cgw-snapshot-lbl">Core Business</div>
                <div className="cgw-snapshot-val">{snapshot.coreBusiness}</div>
              </div>
            </div>

            <div className="cgw-snapshot-item">
              <div className="cgw-snapshot-icon">
                <MapPin size={20} />
              </div>
              <div>
                <div className="cgw-snapshot-lbl">Operations Scope</div>
                <div className="cgw-snapshot-val">{snapshot.operations} (Island-Wide Utility EPC)</div>
              </div>
            </div>

            <div className="cgw-snapshot-item">
              <div className="cgw-snapshot-icon">
                <Users size={20} />
              </div>
              <div>
                <div className="cgw-snapshot-lbl">Engineering Workforce</div>
                <div className="cgw-snapshot-val">{snapshot.workforce}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanySnapshot;

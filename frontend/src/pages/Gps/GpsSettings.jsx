import { useState, useEffect } from 'react';
import { Save, Map, Bell, CircleDot, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const GpsSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    map_default_lat: '',
    map_default_lng: '',
    map_default_zoom: '',
    map_tile_provider: 'osm',
    alert_overspeed_limit: '',
    alert_idle_time_limit: '',
    ui_refresh_rate: '',
    geofence_default_radius: '',
    geofence_default_trigger: 'both'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        settings: Object.entries(settings).map(([key, value]) => ({ key, value }))
      };
      
      await api.post('/settings/batch', payload);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <Loader className="spin" size={32} color="var(--primary)" />
    </div>;
  }

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Advanced Settings</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Configure GPS tracking and alert preferences</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
        
        {/* Map Preferences */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--primary-alpha)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Map size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Map Preferences</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Default Latitude</label>
              <input type="text" className="form-control" name="map_default_lat" value={settings.map_default_lat} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Default Longitude</label>
              <input type="text" className="form-control" name="map_default_lng" value={settings.map_default_lng} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Default Zoom Level</label>
              <input type="number" min="1" max="18" className="form-control" name="map_default_zoom" value={settings.map_default_zoom} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Map Tile Provider</label>
              <select className="form-control" name="map_tile_provider" value={settings.map_tile_provider} onChange={handleChange}>
                <option value="osm">Standard Street Map</option>
                <option value="satellite">Satellite View</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Alert Thresholds</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Overspeed Limit (km/h)</label>
              <input type="number" className="form-control" name="alert_overspeed_limit" value={settings.alert_overspeed_limit} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Idling Time Limit (mins)</label>
              <input type="number" className="form-control" name="alert_idle_time_limit" value={settings.alert_idle_time_limit} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">UI Refresh Rate (secs)</label>
              <input type="number" className="form-control" name="ui_refresh_rate" value={settings.ui_refresh_rate} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Geofencing Defaults */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--info-light)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircleDot size={20} />
            </div>
            <h3 style={{ margin: 0 }}>Geofencing Defaults</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Default Radius (meters)</label>
              <input type="number" className="form-control" name="geofence_default_radius" value={settings.geofence_default_radius} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Default Alert Trigger</label>
              <select className="form-control" name="geofence_default_trigger" value={settings.geofence_default_trigger} onChange={handleChange}>
                <option value="both">Entry & Exit</option>
                <option value="entry">Entry Only</option>
                <option value="exit">Exit Only</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 'var(--sidebar-width)', right: 0,
        background: 'var(--surface)',
        padding: '1rem 2rem',
        borderTop: '1px solid var(--surface-2)',
        display: 'flex', justifyContent: 'flex-end', gap: '1rem',
        zIndex: 50,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
      }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'center' }}>
          {isSaving ? <Loader size={18} className="spin" /> : <Save size={18} />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default GpsSettings;

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Circle, Popup, useMap } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import { MapPin, Plus, Trash2, Edit2, Check, X, ShieldAlert, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import api from '../../services/api';
import L from 'leaflet';

const GeomanControls = ({ onCreated, drawnShape }) => {
  const map = useMap();
  useEffect(() => {
    map.pm.addControls({
      position: 'topright',
      drawCircle: true,
      drawPolygon: true,
      drawRectangle: false,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
    });

    map.on('pm:create', (e) => {
      onCreated(e);
    });

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
    };
  }, [map, onCreated]);
  
  return null;
};

const GpsGeofencing = () => {
  const [geofences, setGeofences] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [geofenceToDelete, setGeofenceToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    alert_type: 'both',
    vehicles: []
  });
  
  // Track the drawn shape internally before saving
  const [drawnShape, setDrawnShape] = useState(null); 
  const featureGroupRef = useRef();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [geofencesRes, vehiclesRes] = await Promise.all([
        api.get('/geofences'),
        api.get('/vehicles')
      ]);
      setGeofences(geofencesRes.data);
      setVehiclesList(vehiclesRes.data.data || vehiclesRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load geofencing data.');
    } finally {
      setLoading(false);
    }
  };

  const onCreated = (e) => {
    const { shape, layer } = e;
    
    // We only allow drawing one new shape at a time for creation
    if (drawnShape) {
      toast.error('You can only draw one shape per geofence.');
      layer.remove();
      return;
    }

    let coordinates = [];
    let radius = null;
    let type = shape.toLowerCase();

    if (type === 'polygon') {
      coordinates = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
    } else if (type === 'circle') {
      coordinates = [layer.getLatLng().lat, layer.getLatLng().lng];
      radius = layer.getRadius();
    }

    setDrawnShape({
      type: type,
      coordinates: coordinates,
      radius: radius
    });
    
    // Open the creation panel
    setIsCreating(true);
  };

  const onDeleted = (e) => {
    // If they delete the unsaved shape
    setDrawnShape(null);
    setIsCreating(false);
  };

  const handleSaveGeofence = async () => {
    if (!formData.name) return toast.error('Name is required');
    if (!drawnShape) return toast.error('You must draw a boundary on the map first');

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: drawnShape.type,
        coordinates: drawnShape.coordinates,
        radius: drawnShape.radius,
        alert_type: formData.alert_type,
        vehicles: formData.vehicles
      };

      await api.post('/geofences', payload);
      toast.success('Geofence created successfully!');
      
      // Reset state
      setIsCreating(false);
      setDrawnShape(null);
      setFormData({ name: '', alert_type: 'both', vehicles: [] });
      
      // We instruct the user to refresh or we clear all drawn layers from Geoman
      // To properly clear Geoman drawn layers, we could iterate through map layers
      // But reloading the data is cleaner.
      fetchData();
      window.location.reload();
    } catch (error) {
      toast.error('Failed to save geofence');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGeofence = (geofence) => {
    setGeofenceToDelete(geofence);
    setDeleteModalOpen(true);
  };

  const handleVehicleToggle = (vehicleId) => {
    setFormData(prev => {
      const isSelected = prev.vehicles.includes(vehicleId);
      if (isSelected) {
        return { ...prev, vehicles: prev.vehicles.filter(id => id !== vehicleId) };
      } else {
        return { ...prev, vehicles: [...prev.vehicles, vehicleId] };
      }
    });
  };

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'grid', gridTemplateColumns: '30% 1fr', gap: '1rem' }}>
      
      {/* Sidebar Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} />
          Geofences
        </h2>

        {isCreating ? (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', color: 'var(--primary)' }}>Create New Geofence</h3>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Geofence Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Main Depot"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Alert Trigger</label>
              <select 
                className="form-control"
                value={formData.alert_type}
                onChange={e => setFormData({...formData, alert_type: e.target.value})}
              >
                <option value="both">Entry & Exit</option>
                <option value="entry">Entry Only</option>
                <option value="exit">Exit Only</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Assign Vehicles</label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '0.5rem' }}>
                {vehiclesList.map(v => (
                  <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.vehicles.includes(v.id)}
                      onChange={() => handleVehicleToggle(v.id)}
                    />
                    {v.vehicle_number}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }} 
                onClick={handleSaveGeofence}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <Loader size={16} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
                    Saving...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                    <Save size={16} /> Save Geofence
                  </span>
                )}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setIsCreating(false);
                  setDrawnShape(null);
                  featureGroupRef.current.clearLayers();
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Use the drawing tools on the map to create a new geofence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {geofences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No geofences created yet.
                </div>
              ) : (
                geofences.map(gf => (
                  <div key={gf.id} style={{ padding: '1rem', border: '1px solid var(--surface-2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--surface-1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontWeight: '600' }}>{gf.name}</h4>
                      <button 
                        className="btn btn-danger" 
                        style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '0.4rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer' }}
                        title="Delete Geofence"
                        onClick={() => handleDeleteGeofence(gf)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>Type: <span style={{ textTransform: 'capitalize' }}>{gf.type}</span></div>
                      <div>Trigger: <span style={{ textTransform: 'capitalize' }}>{gf.alert_type}</span></div>
                      <div>Vehicles: {gf.vehicles.length} assigned</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', padding: 0, position: 'relative', border: '1px solid var(--surface-2)' }}>
        <MapContainer 
          center={[6.9271, 79.8612]} // Default center
          zoom={12} 
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          
          <GeomanControls onCreated={onCreated} drawnShape={drawnShape} />

          {/* Render Existing Geofences */}
          {geofences.map(gf => {
            if (gf.type === 'polygon') {
              return (
                <Polygon key={gf.id} positions={gf.coordinates} color={gf.color || '#3388ff'} fillOpacity={0.2}>
                  <Popup>
                    <b>{gf.name}</b><br/>
                    Trigger: {gf.alert_type}<br/>
                    Vehicles: {gf.vehicles.length}
                  </Popup>
                </Polygon>
              );
            } else if (gf.type === 'circle') {
              return (
                <Circle key={gf.id} center={gf.coordinates} radius={gf.radius} color={gf.color || '#3388ff'} fillOpacity={0.2}>
                  <Popup>
                    <b>{gf.name}</b><br/>
                    Trigger: {gf.alert_type}<br/>
                    Vehicles: {gf.vehicles.length}
                  </Popup>
                </Circle>
              );
            }
            return null;
          })}
        </MapContainer>
      </div>

      {/* Delete Confirmation Modal */}
      {geofenceToDelete && (
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setGeofenceToDelete(null);
          }}
          onDeleted={() => {
            setDeleteModalOpen(false);
            setGeofenceToDelete(null);
            fetchData();
            // Force reload just to completely clear map cache since React-Leaflet sometimes holds layers
            window.location.reload();
          }}
          endpoint={`/geofences/${geofenceToDelete.id}`}
          itemName={`Geofence '${geofenceToDelete.name}'`}
        />
      )}
    </div>
  );
};

export default GpsGeofencing;

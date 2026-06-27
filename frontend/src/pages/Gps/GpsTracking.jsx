import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, MapPin, Activity, Clock, AlertTriangle, Car, Fuel, Key, Snowflake, Plug, Thermometer, Lock, RotateCw, Phone, BarChart2, Share2, Settings, Target, UploadCloud, AlertCircle } from 'lucide-react';
import api from '../../services/api';

// Custom Leaflet SVG marker for top-down car
const getCarSvg = (color, heading = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="24" height="48" style="transform: rotate(${heading}deg); transform-origin: center center; transition: transform 0.5s linear;">
  <defs>
    <linearGradient id="grad${color.replace('#','')}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
      <stop offset="50%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
    </linearGradient>
  </defs>
  <rect x="18" y="12" width="64" height="180" rx="18" fill="rgba(0,0,0,0.3)"/>
  <rect x="20" y="10" width="60" height="180" rx="16" fill="url(#grad${color.replace('#','')})" stroke="#111" stroke-width="1.5"/>
  <path d="M25 60 Q50 50 75 60 L70 85 L30 85 Z" fill="#111" opacity="0.85"/>
  <path d="M28 150 Q50 155 72 150 L68 135 L32 135 Z" fill="#111" opacity="0.85"/>
  <rect x="30" y="85" width="40" height="50" rx="4" fill="${color}" stroke="#111" stroke-width="1" opacity="0.9"/>
  <rect x="26" y="12" width="12" height="6" rx="2" fill="#fffbe0" opacity="0.9"/>
  <rect x="62" y="12" width="12" height="6" rx="2" fill="#fffbe0" opacity="0.9"/>
  <rect x="26" y="182" width="14" height="6" rx="2" fill="#ff4d4d"/>
  <rect x="60" y="182" width="14" height="6" rx="2" fill="#ff4d4d"/>
  <rect x="16" y="65" width="6" height="12" rx="2" fill="${color}" stroke="#111" stroke-width="1"/>
  <rect x="78" y="65" width="6" height="12" rx="2" fill="${color}" stroke="#111" stroke-width="1"/>
</svg>
`;

const createVehicleMarkerIcon = (vehicle) => {
  const isMoving = vehicle.status === 'moving';
  const isOffline = vehicle.status === 'offline';
  const isIdling = vehicle.status === 'idling';

  let color = '#e74c3c'; // red (stopped/parked)
  if (isMoving) color = '#2ecc71'; // green
  if (isIdling) color = '#f1c40f'; // yellow
  if (isOffline) color = '#95a5a6'; // grey

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; width: max-content; transform: translate(-50%, -50%);">
      <div style="background: rgba(18, 30, 61, 0.95); color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 4px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2);">
        ${vehicle.vehicle_number}
      </div>
      <div style="display: flex; justify-content: center; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.5));">
        ${getCarSvg(color, vehicle.heading || 0)}
      </div>
    </div>
  `;

  return new L.divIcon({
    html,
    className: 'custom-vehicle-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -40]
  });
};

// Geocoding Cache & Queue to prevent rate limits
const geocodeCache = new Map();
const geocodeQueue = [];
let isGeocoding = false;

const processGeocodeQueue = async () => {
  if (isGeocoding || geocodeQueue.length === 0) return;
  isGeocoding = true;

  const { lat, lng, callback } = geocodeQueue.shift();
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const cacheKey = `${parsedLat.toFixed(4)},${parsedLng.toFixed(4)}`;

  if (geocodeCache.has(cacheKey)) {
    callback(geocodeCache.get(cacheKey));
    isGeocoding = false;
    processGeocodeQueue();
    return;
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
    const data = await res.json();
    const address = data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : 'Unknown Address';
    geocodeCache.set(cacheKey, address);
    callback(address);
  } catch (error) {
    callback('Address unavailable');
  }

  // Wait 1 second to comply with Nominatim rate limit (1 req/sec)
  setTimeout(() => {
    isGeocoding = false;
    processGeocodeQueue();
  }, 1000);
};

const getAddress = (lat, lng, callback) => {
  geocodeQueue.push({ lat, lng, callback });
  processGeocodeQueue();
};


const GpsTracking = () => {
  const [vehicles, setVehicles] = useState({});
  const [dailyDistance, setDailyDistance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  
  const mapRef = useRef(null);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [currentRes, statsRes] = await Promise.all([
          api.get('/gps-dashboard/current'),
          api.get('/gps-dashboard/statistics')
        ]);

        const initialVehicles = {};
        currentRes.data.locations.forEach(v => {
          initialVehicles[v.vehicle_id] = {
            ...v,
            lastUpdate: new Date(v.logged_at).toLocaleTimeString(),
            status_changed_at: Date.now(),
            address: 'Resolving address...',
            lastGeocodeTime: Date.now()
          };
          
          // Queue address resolution
          getAddress(v.latitude, v.longitude, (address) => {
            setVehicles(prev => ({
              ...prev,
              [v.vehicle_id]: { ...prev[v.vehicle_id], address, lastGeocodeTime: Date.now() }
            }));
          });
        });

        setVehicles(initialVehicles);
        setDailyDistance(statsRes.data.total_distance_today_km);
      } catch (error) {
        console.error("Failed to load GPS data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // WebSocket Listener
  useEffect(() => {
    if (window.Echo) {
      const channel = window.Echo.channel('gps-updates');
      
      channel.listen('.location.updated', (event) => {
        const data = event.gpsData;
        
        let status = 'offline';
        if (data.speed > 0) status = 'moving';
        else if (data.speed === 0 && data.ignition_status) status = 'idling';
        else status = 'parked';

        setVehicles(prev => {
          const existing = prev[data.vehicle_id] || {};

          let status_changed_at = existing.status_changed_at || Date.now();
          if (existing.status && existing.status !== status) {
            status_changed_at = Date.now();
          }

          // Calculate heading based on previous coordinate
          let heading = existing.heading || 0;
          if (existing.latitude && existing.longitude && status === 'moving') {
            const lat1 = parseFloat(existing.latitude);
            const lng1 = parseFloat(existing.longitude);
            const lat2 = parseFloat(data.latitude);
            const lng2 = parseFloat(data.longitude);
            
            // Flat-earth approximation for tiny distances (perfect for GPS micro-movements)
            const y = lng2 - lng1;
            const x = lat2 - lat1;
            if (x !== 0 || y !== 0) {
              heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
            }
          }
          
          let needsNewAddress = false;
          const now = Date.now();
          const lastGeocode = existing.lastGeocodeTime || 0;

          // Calculate distance added (Haversine formula in JS)
          let today_distance = existing.today_distance || 0;
          if (existing.latitude && existing.longitude && status === 'moving') {
            const lat1 = parseFloat(existing.latitude);
            const lng1 = parseFloat(existing.longitude);
            const lat2 = parseFloat(data.latitude);
            const lng2 = parseFloat(data.longitude);

            const toRad = (deg) => deg * Math.PI / 180;
            const R = 6371; // km
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lng2 - lng1);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            today_distance += (R * c);
          }

          if (!existing.address || existing.address === 'Resolving address...') {
            needsNewAddress = true;
          } else if (status === 'moving' && (now - lastGeocode) >= 60000) {
            needsNewAddress = true;
          }

          if (needsNewAddress) {
            getAddress(data.latitude, data.longitude, (address) => {
              setVehicles(current => ({
                ...current,
                [data.vehicle_id]: { ...current[data.vehicle_id], address, lastGeocodeTime: Date.now() }
              }));
            });
          }

          return {
            ...prev,
            [data.vehicle_id]: {
              ...existing,
              ...data,
              status,
              heading,
              today_distance,
              status_changed_at,
              lastUpdate: new Date().toLocaleTimeString(),
              address: existing.address || 'Resolving address...',
              lastGeocodeTime: existing.lastGeocodeTime || Date.now()
            }
          };
        });

        if (data.distance_added) {
            setDailyDistance(prev => prev + data.distance_added);
        }
      });

      return () => channel.stopListening('.location.updated');
    }
  }, []);

  const activeVehicles = Object.values(vehicles);
  
  // Calculate live stats based on ALL vehicles
  const liveStats = useMemo(() => {
    const stats = { moving: 0, idling: 0, parked: 0, offline: 0 };
    activeVehicles.forEach(v => {
      if (stats[v.status] !== undefined) stats[v.status]++;
    });
    return stats;
  }, [activeVehicles]);

  // Apply filter
  const filteredVehicles = useMemo(() => {
    return activeVehicles.filter(v => {
      if (activeFilter && v.status !== activeFilter) return false;
      if (selectedVehicleId && v.vehicle_id !== selectedVehicleId) return false;
      if (searchQuery && !v.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [activeVehicles, activeFilter, searchQuery, selectedVehicleId]);

  const defaultCenter = [6.9271, 79.8612];

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading GPS Dashboard...</div>;

  return (
    <div className="gps-tracking-root" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(96vh - 100px)' }}>
      <style>{`
        .custom-vehicle-marker {
          transition: transform 2s linear !important;
        }
      `}</style>
      
      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard title="Today Distance" value={`${dailyDistance.toFixed(2)} km`} icon={<Activity size={24} color="var(--primary)" />} />
        <StatCard title="Moving" value={liveStats.moving} icon={<Navigation size={24} color="var(--success)" />} isActive={activeFilter === 'moving'} isFaded={activeFilter !== null && activeFilter !== 'moving'} onClick={() => setActiveFilter(prev => prev === 'moving' ? null : 'moving')} />
        <StatCard title="Idling (Engine ON)" value={liveStats.idling} icon={<Clock size={24} color="var(--warning)" />} isActive={activeFilter === 'idling'} isFaded={activeFilter !== null && activeFilter !== 'idling'} onClick={() => setActiveFilter(prev => prev === 'idling' ? null : 'idling')} />
        <StatCard title="Parked" value={liveStats.parked} icon={<MapPin size={24} color="var(--text-muted)" />} isActive={activeFilter === 'parked'} isFaded={activeFilter !== null && activeFilter !== 'parked'} onClick={() => setActiveFilter(prev => prev === 'parked' ? null : 'parked')} />
        <StatCard title="Offline" value={liveStats.offline} icon={<AlertTriangle size={24} color="var(--danger)" />} isActive={activeFilter === 'offline'} isFaded={activeFilter !== null && activeFilter !== 'offline'} onClick={() => setActiveFilter(prev => prev === 'offline' ? null : 'offline')} />
      </div>

      {/* Main Layout */}
      <div className="gps-main-layout" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>
        
        {/* Sidebar List */}
        <div className="card gps-list-panel" style={{ padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Car color="var(--info)" /> Live Fleet Status
            </h2>
            <button 
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '4px' }}
              onClick={() => {
                setActiveFilter(null);
                setSearchQuery('');
                setSelectedVehicleId(null);
              }}
            >
              Reset
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Search vehicle..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem', fontSize: '0.875rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
            />
            <select 
              value={selectedVehicleId || ''} 
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setSelectedVehicleId(id);
                if (id && vehicles[id] && mapRef.current) {
                  mapRef.current.flyTo([vehicles[id].latitude, vehicles[id].longitude], 16, { animate: true, duration: 1 });
                }
              }}
              style={{ padding: '0.5rem', fontSize: '0.875rem', border: '1px solid #ccc', borderRadius: '4px', width: '100%' }}
            >
              <option value="">Select Vehicle</option>
              {activeVehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_number}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredVehicles.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Waiting for GPS signals...</p>
            ) : (
              filteredVehicles.map(v => (
                <div key={v.vehicle_id} style={{ marginBottom: selectedVehicleId === v.vehicle_id ? '0' : '0.25rem' }}>
                  <div 
                    onClick={() => {
                      if (selectedVehicleId === v.vehicle_id) {
                        setSelectedVehicleId(null);
                      } else {
                        setSelectedVehicleId(v.vehicle_id);
                        if (mapRef.current) {
                          mapRef.current.flyTo([v.latitude, v.longitude], 16, { animate: true, duration: 1 });
                        }
                      }
                    }}
                    style={{ 
                      cursor: 'pointer',
                      background: selectedVehicleId === v.vehicle_id ? '#f0f7ff' : '#ffffff', 
                      border: selectedVehicleId === v.vehicle_id ? '2px solid var(--primary)' : '1px solid #e0e0e0',
                      borderBottomLeftRadius: selectedVehicleId === v.vehicle_id ? '0' : '8px', 
                      borderBottomRightRadius: selectedVehicleId === v.vehicle_id ? '0' : '8px', 
                      borderTopLeftRadius: '8px',
                      borderTopRightRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      color: '#333',
                      transition: 'all 0.2s ease'
                    }}>
                  {/* Top Section */}
                  <div style={{ display: 'flex', padding: '1rem 1rem 0.5rem 1rem', position: 'relative' }}>
                    {/* Left image icon */}
                    {/* <div style={{ marginRight: '1rem', marginTop: '0.2rem' }}>
                      <Car size={36} color={v.status === 'moving' ? '#2ecc71' : '#e74c3c'} />
                    </div> */}

                    {/* Center info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#000', marginBottom: '1rem', lineHeight: '1' }}>
                        {v.vehicle_number}
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: v.status === 'moving' ? '#2ecc71' : v.status === 'offline' ? '#3498db' : v.status === 'idling' ? '#f39c12' : '#e74c3c', textTransform: 'uppercase' }}>
                        {v.status === 'moving' ? 'RUNNING' : v.status === 'offline' ? 'OUT OF REACH' : v.status === 'idling' ? 'IDLING' : 'STOPPED'} 
                        <span style={{ color: '#888', fontWeight: 'normal', textTransform: 'none', marginLeft: '0.25rem' }}>since {getTimeSince(v.status_changed_at)}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#c0392b', marginTop: '0.2rem' }}>
                        Last updated - {v.lastUpdate}
                      </div>
                    </div>

                    {/* Right stats */}
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Fuel size={20} color="#000" />
                        <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>0 L</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Activity size={20} color="#c0392b" />
                        <span style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>{Math.round(v.speed)} KMPH</span>
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 1rem', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <MapPin size={16} color="#666" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: '1.4' }}>{v.address}</div>
                  </div>

                  {/* Sensors and Red Odo Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0 0.5rem 1rem', alignItems: 'center' }}>
                      <Key size={16} color={v.ignition_status ? '#2ecc71' : '#e74c3c'} />
                      <Snowflake size={16} color="#00eeffff" />
                      <Fuel size={16} color="#e74c3c" />
                      <Plug size={16} color="#2ecc71" />
                      <MapPin size={16} color="#2ecc71" />
                      <Thermometer size={16} color="#95a5a6" />
                      <Car size={16} color="#e74c3c" />
                      <Lock size={16} color="#2ecc71" />
                    </div>

                    <div style={{ 
                      background: 'linear-gradient(135deg, #a40606 0%, #d50000 100%)', 
                      color: '#fff',
                      padding: '0.5rem 1.5rem',
                      clipPath: 'polygon(30px 0, 100% 0, 100% 100%, 0 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '130px'
                    }}>
                      <span style={{ fontSize: '0.7rem', marginBottom: '0.2rem' }}>Today's Odo</span>
                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{Number(v.today_distance || 0).toFixed(2)} KM</span>
                    </div>
                  </div>

                  {/* Black Footer */}
                  <div style={{ background: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '0.4rem 1rem', fontSize: '0.65rem', fontWeight: 'bold' }}>
                    {/* <span>Licence Purchased On - {new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                    <span>Licence Expires On - {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span> */}
                  </div>
                  </div>
                  
                  {/* Action Grid below selected card */}
                  {selectedVehicleId === v.vehicle_id && (
                    <div style={{ 
                      padding: '1.5rem 1rem', 
                      background: '#f8f9fa', 
                      border: '2px solid var(--primary)', 
                      borderTop: 'none', 
                      borderBottomLeftRadius: '8px', 
                      borderBottomRightRadius: '8px', 
                      marginBottom: '0.25rem' 
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                        {/* <ActionIcon icon={<MapPin color="#e74c3c" size={24} />} label="Live" />
                        <ActionIcon icon={<Clock color="#000" size={24} />} label="History" />
                        <ActionIcon icon={<Car color="#e74c3c" size={24} />} label="Parking" /> */}
                        <ActionIcon icon={<Lock color="#2ecc71" size={24} />} label="Immobilize" />
                        
                        <ActionIcon icon={<AlertCircle color="#e74c3c" size={24} />} label="Tow" />
                        <ActionIcon icon={<Phone color="#3498db" size={24} />} label="Driver" />
                        <ActionIcon icon={<BarChart2 color="#f39c12" size={24} />} label="Analytics" />
                        <ActionIcon icon={<Share2 color="#e74c3c" size={24} />} label="Share" />
                        
                        <ActionIcon icon={<Settings color="#3498db" size={24} />} label="Settings" />
                        <ActionIcon icon={<Target color="#3498db" size={24} />} label="Geofence" />
                        <ActionIcon icon={<UploadCloud color="#3498db" size={24} />} label="Document" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--surface-2)', padding: 0, position: 'relative' }}>
          <MapContainer ref={mapRef} center={defaultCenter} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {filteredVehicles.map(v => (
              <Marker key={v.vehicle_id} position={[v.latitude, v.longitude]} icon={createVehicleMarkerIcon(v)}>
                <Popup>
                  <div style={{ padding: '0.5rem', width: '220px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem' }}>{v.vehicle_number}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.3' }}>{v.address}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>Speed:</span>
                      <strong>{Math.round(v.speed)} km/h</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>Status:</span>
                      <strong style={{ textTransform: 'capitalize', color: `var(--${getStatusColor(v.status)})` }}>{v.status}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span>Coordinates:</span>
                      <strong style={{ fontSize: '0.75rem' }}>{Number(v.latitude).toFixed(5)}, {Number(v.longitude).toFixed(5)}</strong>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

      </div>
    </div>
  );
};

// Helper Components & Functions
const StatCard = ({ title, value, icon, onClick, isActive, isFaded }) => (
  <div 
    className="card" 
    onClick={onClick}
    style={{ 
      padding: '1.25rem', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem', 
      background: isActive ? 'var(--surface-2)' : 'var(--surface-1)', 
      border: isActive ? '1px solid var(--primary)' : '1px solid var(--surface-2)', 
      boxShadow: isActive ? '0 0 0 1px var(--primary)' : 'var(--shadow-sm)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      opacity: isFaded ? 0.5 : 1
    }}
  >
    <div style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value}</div>
    </div>
  </div>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'moving': return 'success';
    case 'idling': return 'warning';
    case 'parked': return 'secondary';
    case 'offline': return 'danger';
    default: return 'primary';
  }
};

const ActionIcon = ({ icon, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: '0.5rem', textAlign: 'center' }}>
    <div style={{ background: '#fff', borderRadius: '50%', padding: '0.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {icon}
    </div>
    <span style={{ fontSize: '0.7rem', color: '#000', fontWeight: '500' }}>{label}</span>
  </div>
);

const getTimeSince = (timestamp) => {
  if (!timestamp) return '0hrs 0mins';
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hrs}hrs ${mins}mins`;
};

export default GpsTracking;

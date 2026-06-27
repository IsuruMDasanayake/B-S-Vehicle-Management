import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Calendar, Search, Clock, Filter, Map, Play, Pause, FastForward, Navigation, Settings, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
import api from '../../services/api';

const startIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/190/190411.png', iconSize: [32, 32], iconAnchor: [16, 32] });
const endIcon = new L.Icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/1483/1483336.png', iconSize: [32, 32], iconAnchor: [16, 32] });

// Custom marker for parking
const parkingIcon = new L.DivIcon({ 
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="12" fill="#e74c3c" />
      <text x="12" y="16.5" fill="white" font-size="14" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">P</text>
    </svg>
  `,
  className: '',
  iconSize: [24, 24], 
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Custom marker for idling
const idlingIcon = new L.DivIcon({ 
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="12" fill="#f39c12" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="white" stroke-width="2"/>
      <polyline points="12 7 12 12 15 15" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  className: '',
  iconSize: [24, 24], 
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Helper for animating car
const getCarSvg = (color = "#2ecc71", heading = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="24" height="48" style="transform: rotate(${heading}deg); transform-origin: center center; transition: transform 0.1s linear;">
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

const getCarIcon = (heading, color = "#2ecc71") => new L.DivIcon({
  html: getCarSvg(color, heading),
  className: '',
  iconSize: [24, 48],
  iconAnchor: [12, 24]
});

const engineOffIcon = new L.Icon({ 
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/595/595005.png', // red key/engine off
  iconSize: [24, 24], 
  iconAnchor: [12, 24],
  popupAnchor: [0, -20]
});

const engineOnIcon = new L.Icon({ 
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/595/595007.png', // green key/engine on
  iconSize: [24, 24], 
  iconAnchor: [12, 24],
  popupAnchor: [0, -20]
});

const GpsHistory = () => {
  const [vehicleId, setVehicleId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [minSpeed, setMinSpeed] = useState('');
  const [routeData, setRouteData] = useState([]);
  const [eventsData, setEventsData] = useState([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [loading, setLoading] = useState(false);

  const [vehiclesList, setVehiclesList] = useState([]);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [interpolatedPos, setInterpolatedPos] = useState(null);

  const playerRef = useRef(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await api.get('/vehicles');
        setVehiclesList(response.data.data || response.data || []);
      } catch (err) {
        console.error("Failed to fetch vehicles", err);
      }
    };
    fetchVehicles();
  }, []);

  const setQuickFilter = (type) => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now - tzOffset);
    
    let start = new Date(now - tzOffset);
    if (type === '1hour') {
      start.setHours(start.getHours() - 1);
    } else if (type === 'today') {
      start.setHours(0,0,0,0);
    } else if (type === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0,0,0,0);
      localNow.setDate(localNow.getDate() - 1);
      localNow.setHours(23,59,59,999);
    } else if (type === 'week') {
      start.setDate(start.getDate() - 7);
      start.setHours(0,0,0,0);
    }
    
    setFromDate(start.toISOString().split('T')[0]);
    setToDate(localNow.toISOString().split('T')[0]);
    setFromTime(start.toISOString().split('T')[1].substring(0, 5));
    setToTime(localNow.toISOString().split('T')[1].substring(0, 5));
  };

  const fetchHistory = async (e) => {
    e.preventDefault();
    if (!vehicleId || !fromDate || !toDate) {
      return toast.error("Please select a vehicle and a valid date range.");
    }
    
    setLoading(true);
    try {
      let query = `/gps-dashboard/${vehicleId}/history?from_date=${fromDate}&to_date=${toDate}`;
      if (fromTime) query += `&from_time=${fromTime}`;
      if (toTime) query += `&to_time=${toTime}`;
      if (minSpeed) query += `&min_speed=${minSpeed}`;

      const response = await api.get(query);
      
      if (response.data && response.data.path && response.data.path.length > 0) {
        setRouteData(response.data.path);
        setEventsData(response.data.events || []);
        setDistanceKm(response.data.distance_km || 0);
        setCurrentIndex(0);
        setIsPlaying(false);
        toast.success(`Loaded ${response.data.path.length} coordinates.`);
      } else {
        setRouteData([]);
        setEventsData([]);
        setCurrentIndex(0);
        setDistanceKm(0);
        toast.error('No GPS data found for these filters.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch history.');
    } finally {
      setLoading(false);
    }
  };

  const defaultCenter = [6.9271, 79.8612];
  const positions = routeData.map(log => [log.lat, log.lng]);

  // Player Effect
  useEffect(() => {
    let animationFrame;
    let startTime;
    const duration = 1000 / playbackSpeed; // time to travel between two points
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;

      if (progress < 1) {
        const currentLog = routeData[currentIndex];
        const nextLog = routeData[currentIndex + 1];
        
        if (currentLog && nextLog) {
          const startLat = Number(currentLog.lat);
          const startLng = Number(currentLog.lng);
          const endLat = Number(nextLog.lat);
          const endLng = Number(nextLog.lng);
          
          const lat = startLat + (endLat - startLat) * progress;
          const lng = startLng + (endLng - startLng) * progress;
          setInterpolatedPos([lat, lng]);
        }
        animationFrame = requestAnimationFrame(animate);
      } else {
        // move to next point
        setCurrentIndex((prev) => {
          if (prev >= routeData.length - 1) {
            setIsPlaying(false);
            setInterpolatedPos(null);
            return prev;
          }
          return prev + 1;
        });
      }
    };

    if (isPlaying && routeData.length > 0 && currentIndex < routeData.length - 1) {
      animationFrame = requestAnimationFrame(animate);
    } else if (!isPlaying) {
      setInterpolatedPos(null);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, currentIndex, playbackSpeed, routeData]);

  // Calculate heading
  const calculateHeading = (p1, p2) => {
    if (!p1 || !p2) return null;
    const dy = p2.lat - p1.lat;
    const dx = Math.cos(Math.PI / 180 * p1.lat) * (p2.lng - p1.lng);
    if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) return null; // Very close points
    const angle = Math.atan2(dy, dx);
    return 90 - angle * (180 / Math.PI);
  };

  const currentLog = routeData[currentIndex];
  const nextLog = routeData[currentIndex + 1];

  // We need to keep track of the last valid heading so it doesn't snap when stopped
  const lastValidHeadingRef = useRef(0);
  
  let heading = 0;
  if (currentLog && nextLog) {
    const calc = calculateHeading(currentLog, nextLog);
    if (calc !== null) {
      heading = calc;
      lastValidHeadingRef.current = calc;
    } else {
      heading = lastValidHeadingRef.current;
    }
  } else {
    heading = lastValidHeadingRef.current;
  }

  return (
    <div className="gps-history-root no-scrollbar" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="gps-history-layout" style={{ display: 'grid', gridTemplateColumns: '30% 1fr', gap: '1rem', height: '100%' }}>
        {/* Filters Sidebar (Left 30%) */}
        <div className="card gps-history-sidebar no-scrollbar" style={{ padding: '1rem', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Map color="var(--info)" /> Route History
        </h2>
        
        <form onSubmit={fetchHistory} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Vehicle <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select 
              className="form-control"
              value={vehicleId} 
              onChange={(e) => setVehicleId(e.target.value)}
              required
            >
              <option value="">-- Choose a Vehicle --</option>
              {vehiclesList.map(v => (
                <option key={v.id} value={v.id}>{v.vehicle_number}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <button type="button" onClick={() => setQuickFilter('1hour')} style={{ flex: 1, padding: '0.25rem', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>1 Hour</button>
            <button type="button" onClick={() => setQuickFilter('today')} style={{ flex: 1, padding: '0.25rem', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Today</button>
            <button type="button" onClick={() => setQuickFilter('yesterday')} style={{ flex: 1, padding: '0.25rem', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Yesterday</button>
            <button type="button" onClick={() => setQuickFilter('week')} style={{ flex: 1, padding: '0.25rem', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Week</button>
          </div>
          
          {/* Mobile Combined Date/Time */}
          <div className="gps-history-datetime-row hide-desktop" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                <Calendar size={12} /> From <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div className="form-control" style={{ padding: '0.25rem 0.5rem', height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <input 
                  type="date" 
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.75rem', width: '100%', padding: 0 }}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                />
                <input 
                  type="time" 
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.75rem', width: '100%', padding: 0, color: 'var(--text-muted)' }}
                  value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                <Calendar size={12} /> To <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div className="form-control" style={{ padding: '0.25rem 0.5rem', height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <input 
                  type="date" 
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.75rem', width: '100%', padding: 0 }}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                />
                <input 
                  type="time" 
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.75rem', width: '100%', padding: 0, color: 'var(--text-muted)' }}
                  value={toTime}
                  onChange={(e) => setToTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Desktop Separated Date/Time */}
          <div className="hide-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={14} /> From Date <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input 
                type="date" 
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={14} /> To Date <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input 
                type="date" 
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="hide-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={14} /> From Time
              </label>
              <input 
                type="time" 
                className="form-control"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={14} /> To Time
              </label>
              <input 
                type="time" 
                className="form-control"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group hide-mobile" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Filter size={14} /> Exclude Parked?
            </label>
            <select 
              className="form-control"
              value={minSpeed} 
              onChange={(e) => setMinSpeed(e.target.value)}
            >
              <option value="">Show All Data</option>
              <option value="5">Exclude speed &lt; 5 km/h</option>
              <option value="10">Exclude speed &lt; 10 km/h</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <button 
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '42px', opacity: loading ? 0.7 : 1, marginTop: '0.5rem' }}
            >
              <Search size={18} /> {loading ? 'Fetching...' : 'Fetch Route'}
            </button>
          </div>

        </form>
      </div>

      {/* Map Area */}
      <div className="card gps-history-map-area" style={{ flex: 1, overflow: 'hidden', padding: 0, position: 'relative', border: '1px solid var(--surface-2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          <MapContainer 
            center={positions.length > 0 ? positions[0] : defaultCenter} 
            zoom={12} 
            style={{ flex: 1, width: '100%', height: '100%', zIndex: 10 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            
            {positions.length > 0 && (
              <>
                <Polyline positions={positions} color="var(--info-deep)" weight={4} opacity={1} />
                
                <Marker position={positions[0]} icon={startIcon}>
                  <Popup>Start Point<br/>{routeData[0].time}</Popup>
                </Marker>
                
                <Marker position={positions[positions.length - 1]} icon={endIcon}>
                  <Popup>End Point<br/>{routeData[routeData.length - 1].time}</Popup>
                </Marker>

                {eventsData.map((ev, i) => (
                  <Marker 
                    key={`event-${i}`} 
                    position={[ev.lat, ev.lng]} 
                    icon={ev.type === 'idling' ? idlingIcon : parkingIcon}
                  >
                    <Popup>
                      <b>{ev.type === 'idling' ? 'Idle' : 'Engine OFF'}</b><br/>
                      Duration: {ev.duration_mins} mins<br/>
                      {ev.start_time} - {ev.end_time}
                    </Popup>
                  </Marker>
                ))}

                {/* Animated Car Marker */}
                {currentLog && (
                   <Marker position={interpolatedPos || [currentLog.lat, currentLog.lng]} icon={getCarIcon(heading, currentLog.ignition ? "#2ecc71" : "#f1c40f")} zIndexOffset={1000} />
                )}
              </>
            )}
          </MapContainer>
        </div>

        {/* Player UI */}
        {routeData.length > 0 && (
          <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Top row: Location & Battery */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
                 <MapPin size={16} color="#2ecc71" />
                 <span>{currentLog?.time} | {currentLog?.ignition ? 'Engine ON' : 'Engine OFF'}</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e74c3c', fontSize: '0.875rem' }}>
                 <Settings size={16} /> 12V
               </div>
            </div>
            
            {/* Middle row: Slider & Play controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: 'none', border: '2px solid #e74c3c', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c', cursor: 'pointer' }}>
                 {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '4px' }} />}
               </button>
               
               <input 
                 type="range" 
                 min="0" 
                 max={routeData.length - 1} 
                 value={currentIndex}
                 onChange={(e) => {
                   setCurrentIndex(parseInt(e.target.value));
                   setIsPlaying(false);
                 }}
                 style={{ flex: 1, accentColor: '#e74c3c' }}
               />
               
               <select 
                 value={playbackSpeed} 
                 onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                 style={{ border: 'none', background: 'transparent', color: '#666', fontWeight: 'bold' }}
               >
                 <option value="1">1x</option>
                 <option value="2">2x</option>
                 <option value="5">5x</option>
                 <option value="10">10x</option>
                 <option value="20">20x</option>
               </select>
            </div>
            
            {/* Bottom row: Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666' }}>
                     <Clock size={20} color="#2ecc71" /> <span style={{ fontWeight: '500' }}>{currentLog?.time.split(' ')[1]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666' }}>
                     <Navigation size={20} color="#e74c3c" /> <span style={{ fontWeight: '500' }}>{Math.round(currentLog?.speed || 0)} Km/hr</span>
                  </div>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ fontSize: '1rem', color: '#666', fontWeight: '500' }}>
                    {vehiclesList.find(v => v.id == vehicleId)?.vehicle_number}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666' }}>
                    <Map size={20} color="#e74c3c" />
                    <span style={{ fontSize: '1rem', fontWeight: '500' }}>{distanceKm} Kms</span>
                  </div>
               </div>
            </div>
          {/* End Player UI */}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default GpsHistory;

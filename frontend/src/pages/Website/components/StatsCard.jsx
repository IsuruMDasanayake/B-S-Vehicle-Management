import React, { useEffect, useState, useRef } from 'react';
import { stats } from '../content';

const CountUpNumber = ({ end, suffix }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    let start = 0;
    const duration = 1800;
    const stepTime = Math.abs(Math.floor(duration / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, Math.max(stepTime, 20));

    return () => clearInterval(timer);
  }, [hasStarted, end]);

  if (typeof end !== 'number') {
    return (
      <span ref={ref} className="cgw-stat-value">
        {end}
        {suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className="cgw-stat-value">
      {count}
      {suffix}
    </span>
  );
};

export const StatsCard = () => {
  return (
    <div className="cgw-container cgw-stats-card-wrap">
      <div className="cgw-stats-card">
        {stats.map((stat, idx) => (
          <div key={idx} className="cgw-stat-item">
            <CountUpNumber end={stat.value} suffix={stat.suffix} />
            <div className="cgw-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsCard;

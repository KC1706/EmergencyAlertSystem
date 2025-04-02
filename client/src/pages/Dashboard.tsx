import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chart, registerables } from 'chart.js';
import L from 'leaflet';

// Register Chart.js components
Chart.register(...registerables);

interface DashboardProps {
  severity: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE';
  lastLocation: { lat: number; lng: number };
}

export default function Dashboard({ severity, lastLocation }: DashboardProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [marker, setMarker] = useState<L.Marker | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [sensorData, setSensorData] = useState({
    x: 0,
    y: 0,
    z: 0,
    force: 0
  });

  // Fetch sensor data (simulated)
  const { data } = useQuery({
    queryKey: ['/api/sensor-data'],
    refetchInterval: 3000,
    enabled: false,
    initialData: {
      accelerationX: 0,
      accelerationY: 0,
      accelerationZ: 0,
      force: 0,
      timestamp: new Date().toISOString()
    }
  });

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = L.map(mapRef.current).setView([lastLocation.lat, lastLocation.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(newMap);
      
      const newMarker = L.marker([lastLocation.lat, lastLocation.lng]).addTo(newMap);
      
      setMap(newMap);
      setMarker(newMarker);
    }
  }, [mapRef, map, lastLocation]);

  // Update map when location changes
  useEffect(() => {
    if (map && marker) {
      map.setView([lastLocation.lat, lastLocation.lng], 13);
      marker.setLatLng([lastLocation.lat, lastLocation.lng]);
    }
  }, [map, marker, lastLocation]);

  // Initialize chart
  useEffect(() => {
    if (chartRef.current && !chart) {
      const newChart = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels: ['X', 'Y', 'Z', 'Total'],
          datasets: [{
            label: 'Impact Forces (G)',
            backgroundColor: ['#36a2eb','#ffce56','#4bc0c0','#ff6384'],
            borderColor: ['#36a2eb','#ffce56','#4bc0c0','#ff6384'],
            borderWidth: 1,
            data: [0, 0, 0, 0]
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              max: 35,
              title: {
                display: true,
                text: 'Force (G)'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
      
      setChart(newChart);
    }
  }, [chartRef, chart]);

  // Update chart data with new sensor values
  useEffect(() => {
    if (chart && data) {
      // Simulate some sensor data
      const x = data.accelerationX || Math.random() * 10;
      const y = data.accelerationY || Math.random() * 10;
      const z = data.accelerationZ || Math.random() * 10;
      const force = data.force || Math.sqrt(x*x + y*y + z*z);
      
      setSensorData({ x, y, z, force });
      
      chart.data.datasets[0].data = [x, y, z, force];
      chart.update();
    }
  }, [chart, data]);

  // Calculate severity indicator position
  const getSeverityPosition = () => {
    const SEVERITY_LEVELS = {
      mild: 7,
      moderate: 15,
      severe: 35
    };
    
    const percentage = Math.min(100, (sensorData.force / SEVERITY_LEVELS.severe) * 100);
    return `${percentage}%`;
  };

  // Get severity text color
  const getSeverityColor = () => {
    switch (severity) {
      case 'MILD': return 'text-green-500';
      case 'MODERATE': return 'text-yellow-500';
      case 'SEVERE': return 'text-red-500';
      default: return '';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="material-icons mr-2 text-yellow-500">speed</span>
          Crash Severity: <span id="severity" className={`ml-2 ${getSeverityColor()}`}>{severity}</span>
        </h3>
        <div className="h-5 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative my-3">
          <div className="absolute top-0 w-1 h-6 -mt-0.5 bg-black" style={{ left: getSeverityPosition() }}></div>
        </div>
        <p className="text-gray-700">Last Impact Force: <span className="font-medium">{sensorData.force.toFixed(2)}</span> G</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="material-icons mr-2 text-blue-500">location_on</span>
          Location
        </h3>
        <div ref={mapRef} className="h-48 rounded-md mb-2"></div>
        <p className="text-sm text-gray-600">Lat: {lastLocation.lat.toFixed(6)}, Lng: {lastLocation.lng.toFixed(6)}</p>
        <p className="text-sm text-gray-600">Last Update: <span>{new Date().toLocaleTimeString()}</span></p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="material-icons mr-2 text-blue-500">insights</span>
          Impact Forces
        </h3>
        <div style={{ height: "200px" }}>
          <canvas ref={chartRef}></canvas>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3 flex items-center">
          <span className="material-icons mr-2 text-blue-500">sensors</span>
          Sensor Data
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 p-3 rounded-md text-center">
            <p className="text-xs text-gray-500">X-Axis</p>
            <p className="font-medium text-lg">{sensorData.x.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md text-center">
            <p className="text-xs text-gray-500">Y-Axis</p>
            <p className="font-medium text-lg">{sensorData.y.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md text-center">
            <p className="text-xs text-gray-500">Z-Axis</p>
            <p className="font-medium text-lg">{sensorData.z.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

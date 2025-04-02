// Simulated sensor data interfaces and functions

export interface SensorData {
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  force: number;
  timestamp: string;
}

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
}

// Generate random sensor data for testing
export function generateMockSensorData(): SensorData {
  const x = Math.random() * 10;
  const y = Math.random() * 10;
  const z = Math.random() * 10;
  const force = Math.sqrt(x*x + y*y + z*z);
  
  return {
    accelerationX: parseFloat(x.toFixed(2)),
    accelerationY: parseFloat(y.toFixed(2)),
    accelerationZ: parseFloat(z.toFixed(2)),
    force: parseFloat(force.toFixed(2)),
    timestamp: new Date().toISOString()
  };
}

// Get current location using browser Geolocation API
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          });
        },
        (error) => {
          // Default to a fallback location if permission denied
          if (error.code === error.PERMISSION_DENIED) {
            resolve({
              lat: 22.31641, // Default location if permission denied
              lng: 87.32150
            });
          } else {
            reject(error);
          }
        }
      );
    } else {
      reject(new Error('Geolocation is not supported by this browser'));
    }
  });
}

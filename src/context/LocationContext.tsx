import React, { createContext, useContext, useState, useEffect } from 'react';
import * as ExpoLocation from 'expo-location';
import { Coordinates } from '../types';

interface LocationContextType {
  location: Coordinates | null;
  address: string;
  hasPermission: boolean;
  isTracking: boolean;
  requestPermission: () => Promise<boolean>;
  startTracking: (callback?: (coords: Coordinates) => void) => void;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<Coordinates | null>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [subscription, setSubscription] = useState<ExpoLocation.LocationSubscription | null>(null);

  useEffect(() => {
    checkPermission();
    return () => { subscription?.remove(); };
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        await getCurrentLocation();
      }
    } catch {
      setHasPermission(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      if (granted) await getCurrentLocation();
      return granted;
    } catch {
      setHasPermission(false);
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<Coordinates | null> => {
    try {
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const coords: Coordinates = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setLocation(coords);

      // Reverse geocode
      const geocode = await ExpoLocation.reverseGeocodeAsync(coords);
      if (geocode.length > 0) {
        const g = geocode[0];
        const addr = [g.street, g.district, g.city].filter(Boolean).join('، ');
        setAddress(addr);
      }

      return coords;
    } catch {
      return null;
    }
  };

  const startTracking = (callback?: (coords: Coordinates) => void) => {
    if (isTracking) return;
    setIsTracking(true);

    ExpoLocation.watchPositionAsync(
      { accuracy: ExpoLocation.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
      (pos) => {
        const coords: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setLocation(coords);
        callback?.(coords);
      }
    ).then(sub => setSubscription(sub));
  };

  const stopTracking = () => {
    subscription?.remove();
    setSubscription(null);
    setIsTracking(false);
  };

  return (
    <LocationContext.Provider value={{
      location, address, hasPermission, isTracking,
      requestPermission, startTracking, stopTracking, getCurrentLocation,
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
};

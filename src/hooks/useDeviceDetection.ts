import { useEffect, useState } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isLowPerformance: boolean;
}

export function useDeviceDetection(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isIOS: false,
    isAndroid: false,
    isLowPerformance: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isMobile = /Mobi|Android/i.test(ua);
    const isTablet = /Tablet|iPad/i.test(ua) || (isIOS && !/iPhone/i.test(ua));
    const isDesktop = !isMobile && !isTablet;
    
    // We consider Desktop/Preview as "Low Performance" for the specific heavy visual effects 
    // this app uses, because they are optimized for mobile GPUs.
    const isLowPerformance = isDesktop || (typeof window !== 'undefined' && window.location.hostname.includes('lovable.app'));

    setDevice({
      isMobile,
      isTablet,
      isDesktop,
      isIOS,
      isAndroid,
      isLowPerformance,
    });
  }, []);

  return device;
}

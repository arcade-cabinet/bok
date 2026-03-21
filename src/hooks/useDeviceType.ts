import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface DeviceInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
}

function getIsTouch(): boolean {
  return 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
}

function getDeviceType(width: number): DeviceType {
  const isTouch = getIsTouch();
  if (isTouch && width < 768) return 'mobile';
  if (isTouch && width < 1024) return 'tablet';
  return 'desktop';
}

function getDeviceInfo(): DeviceInfo {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const deviceType = getDeviceType(w);
  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTouch: getIsTouch(),
    screenWidth: w,
    screenHeight: h,
    isLandscape: w > h,
  };
}

export function useDeviceType(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    const update = () => setInfo(getDeviceInfo());

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    // matchMedia listener for fine pointer changes (e.g. connecting a mouse)
    const mql = matchMedia('(pointer: fine)');
    mql.addEventListener('change', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      mql.removeEventListener('change', update);
    };
  }, []);

  return info;
}

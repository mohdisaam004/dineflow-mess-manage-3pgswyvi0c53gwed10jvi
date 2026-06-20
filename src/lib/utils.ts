import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getDeviceInfo(): string {
  if (typeof window === 'undefined') {
    return 'Server';
  }
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  // OS Detection
  if (ua.indexOf('Win') !== -1) os = 'Windows';
  if (ua.indexOf('Mac') !== -1) os = 'MacOS';
  if (ua.indexOf('Linux') !== -1) os = 'Linux';
  if (ua.indexOf('Android') !== -1) os = 'Android';
  if (ua.indexOf('like Mac') !== -1) os = 'iOS';
  // Browser Detection
  if (ua.indexOf('Firefox') !== -1) {
    browser = 'Firefox';
  } else if (ua.indexOf('SamsungBrowser') !== -1) {
    browser = 'Samsung Browser';
  } else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) {
    browser = 'Opera';
  } else if (ua.indexOf('Trident') !== -1) {
    browser = 'Internet Explorer';
  } else if (ua.indexOf('Edge') !== -1) {
    browser = 'Edge';
  } else if (ua.indexOf('Chrome') !== -1) {
    browser = 'Chrome';
  } else if (ua.indexOf('Safari') !== -1) {
    browser = 'Safari';
  }
  return `${browser} on ${os}`;
}
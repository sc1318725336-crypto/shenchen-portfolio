import React from 'react';
import { createRoot } from 'react-dom/client';
import Lanyard from './lanyard/Lanyard.jsx';
import profileImage from '../assets/images/profile.jpg';
import brandLanyard from '../assets/images/lanyard-brand.png';

const host = document.getElementById('lanyard-root');
let mounted = false;

const mountLanyard = () => {
  if (!host || mounted) return;
  mounted = true;
  createRoot(host).render(
    <Lanyard
      position={[0, 3, 12.5]}
      gravity={[0, -40, 0]}
      fov={20}
      transparent={true}
      frontImage={profileImage}
      imageFit="contain"
      lanyardImage={brandLanyard}
      lanyardWidth={1.15}
    />
  );
};

if (host) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      observer.disconnect();
      mountLanyard();
    }
  }, { threshold: 0.55, rootMargin: '0px 0px -5% 0px' });
  observer.observe(host);
}
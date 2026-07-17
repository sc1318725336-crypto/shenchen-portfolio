import React from 'react';
import { createRoot } from 'react-dom/client';
import DomeGallery from './DomeGallery.jsx';

const host = document.getElementById('logo-dome-root');
const logoImages = Array.from({ length: 48 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    src: `./assets/logos/logo-${number}.png`,
    alt: `Logo archive ${number}`
  };
});

if (host) {
  createRoot(host).render(
    <DomeGallery
      images={logoImages}
      fit={0.5}
      fitBasis="auto"
      minRadius={520}
      maxRadius={920}
      padFactor={0.18}
      overlayBlurColor="#030303"
      maxVerticalRotationDeg={7}
      dragSensitivity={18}
      dragDampening={0.8}
      enlargeTransitionMs={320}
      openedImageWidth="min(78vw, 460px)"
      openedImageHeight="min(78vw, 460px)"
      imageBorderRadius="10px"
      openedImageBorderRadius="16px"
      grayscale={false}
    />
  );
}

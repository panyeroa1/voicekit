/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import './Hero.css';

const HERO_IMAGE_URL = "https://i.imgur.com/83DVRPb.png";

const Hero: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!heroRef.current) return;

      const { clientX, clientY } = event;
      const { innerWidth, innerHeight } = window;
      
      // Calculate position from -1 to 1
      const xPos = (clientX / innerWidth - 0.5) * 2;
      const yPos = (clientY / innerHeight - 0.5) * 2;
      
      const depth = 15;
      
      const transform = `translate(${xPos * depth}px, ${yPos * depth}px)`;
      
      heroRef.current.style.transform = transform;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="hero-container">
      <div className="hero-content">
        <div className="hero-image-wrapper" ref={heroRef}>
          <img src={HERO_IMAGE_URL} alt="Kithai AI Assistant" className="hero-image" />
        </div>
        <div className="hero-text">
          <h1 className="hero-title">Kithai</h1>
          <p className="hero-subtitle">Your AI Business Assistant</p>
          <div className="hero-prompt">
             <span className="icon">graphic_eq</span>
             <p>Press the microphone to begin</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;

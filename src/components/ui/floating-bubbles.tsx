// Floating Bubbles Background - Animated MYNGO ball bubbles with parallax effect
// Created: Beautiful floating bubble animation with MYNGO calls

import React, { useEffect, useState } from 'react';
import { getRandomMyngoCall } from '../../utils/myngo-utils';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  call: string;
  speed: number;
  drift: number;
  opacity: number;
}

interface FloatingBubblesProps {
  mouseX?: number;
  mouseY?: number;
}

export function FloatingBubbles({ mouseX = 0, mouseY = 0 }: FloatingBubblesProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Initialize bubbles
    const initialBubbles: Bubble[] = [];
    for (let i = 0; i < 18; i++) {
      initialBubbles.push(createBubble(i));
    }
    setBubbles(initialBubbles);

    // Animation loop
    const interval = setInterval(() => {
      setBubbles(prevBubbles => 
        prevBubbles.map(bubble => {
          let newY = bubble.y - bubble.speed;
          let newX = bubble.x + Math.sin(Date.now() * 0.001 + bubble.id) * bubble.drift;
          
          // Reset bubble when it goes off screen
          if (newY < -100) {
            return createBubble(bubble.id);
          }
          
          return {
            ...bubble,
            x: newX,
            y: newY
          };
        })
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  function createBubble(id: number): Bubble {
    return {
      id,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + Math.random() * 200,
      size: 40 + Math.random() * 40, // 40-80px
      call: getRandomMyngoCall(),
      speed: 0.5 + Math.random() * 1, // 0.5-1.5px per frame
      drift: 0.2 + Math.random() * 0.3, // horizontal drift
      opacity: 0.1 + Math.random() * 0.2 // 0.1-0.3 opacity
    };
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute rounded-full border border-white/10 backdrop-blur-sm flex items-center justify-center text-white/60 font-mono text-xs transition-transform duration-100"
          style={{
            left: bubble.x + (mouseX * 0.02),
            top: bubble.y + (mouseY * 0.02),
            width: bubble.size,
            height: bubble.size,
            backgroundColor: `rgba(139, 92, 246, ${bubble.opacity})`,
            boxShadow: `0 0 ${bubble.size * 0.3}px rgba(139, 92, 246, 0.3)`,
            transform: `translate(-50%, -50%)`
          }}
        >
          {bubble.call}
        </div>
      ))}
    </div>
  );
}
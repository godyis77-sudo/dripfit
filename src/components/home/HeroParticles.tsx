import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

/**
 * Floating gold sparkle particles — renders behind the hero section.
 * Uses a lightweight canvas for performance.
 */
const HeroParticles = ({ className = '' }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  const spawn = useCallback((w: number, h: number) => {
    const hue = 38 + Math.random() * 10; // gold range 38-48
    return {
      x: Math.random() * w,
      y: h * 0.3 + Math.random() * h * 0.5,
      size: 1 + Math.random() * 2.5,
      opacity: 0,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.2 - Math.random() * 0.4,
      life: 0,
      maxLife: 120 + Math.random() * 100,
      hue,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const maxParticles = 25;

    const animate = (time: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Spawn new particles
      if (time - lastSpawnRef.current > 200 && particlesRef.current.length < maxParticles) {
        particlesRef.current.push(spawn(w, h));
        lastSpawnRef.current = time;
      }

      // Update & draw
      particlesRef.current = particlesRef.current.filter(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Fade in first 20%, fade out last 30%
        const progress = p.life / p.maxLife;
        if (progress < 0.2) {
          p.opacity = (progress / 0.2) * 0.6;
        } else if (progress > 0.7) {
          p.opacity = ((1 - progress) / 0.3) * 0.6;
        }

        if (p.life >= p.maxLife) return false;

        // Draw glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 76%, 50%, ${p.opacity})`);
        gradient.addColorStop(0.4, `hsla(${p.hue}, 76%, 42%, ${p.opacity * 0.4})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 76%, 42%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [spawn]);

  return (
    <motion.canvas
      ref={canvasRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, delay: 0.5 }}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default HeroParticles;

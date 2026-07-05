import React, { useRef, useEffect } from 'react';

interface ConfettiProps {
  isActive: boolean;
}

const Confetti: React.FC<ConfettiProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isActive && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let width = window.innerWidth;
      let height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      const particles: Particle[] = [];
      const particleCount = 200;
      const colors = ['#a855f7', '#ec4899', '#fde047', '#4ade80', '#60a5fa'];

      class Particle {
        x: number;
        y: number;
        size: number;
        speedX: number;
        speedY: number;
        color: string;
        opacity: number;
        spin: number;
        spinSpeed: number;

        constructor() {
          this.x = Math.random() * width;
          this.y = Math.random() * -height;
          this.size = Math.random() * 8 + 4;
          this.speedX = Math.random() * 4 - 2;
          this.speedY = Math.random() * 5 + 2;
          this.color = colors[Math.floor(Math.random() * colors.length)];
          this.opacity = 1;
          this.spin = Math.random() * Math.PI * 2;
          this.spinSpeed = Math.random() * 0.1 - 0.05;
        }

        update() {
          this.x += this.speedX;
          this.y += this.speedY;
          this.speedY += 0.05;
          this.spin += this.spinSpeed;
          if (this.y > height) {
            this.y = -this.size;
            this.x = Math.random() * width;
          }
        }

        draw() {
          ctx!.save();
          ctx!.globalAlpha = this.opacity;
          ctx!.fillStyle = this.color;
          ctx!.translate(this.x + this.size / 2, this.y + this.size / 2);
          ctx!.rotate(this.spin);
          ctx!.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.5);
          ctx!.restore();
        }
      }

      function init() {
        for (let i = 0; i < particleCount; i++) {
          particles.push(new Particle());
        }
      }

      let animationFrameId: number;
      function animate() {
        ctx!.clearRect(0, 0, width, height);
        for (const particle of particles) {
          particle.update();
          particle.draw();
        }
        animationFrameId = requestAnimationFrame(animate);
      }

      const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
      }

      window.addEventListener('resize', handleResize);

      init();
      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isActive]);

  if (!isActive) return null;

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }} />;
};

export default Confetti;

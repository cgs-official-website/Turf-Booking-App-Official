import React, { useEffect, useRef } from 'react';

export const Turf3DCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 520);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 440);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse tracking for 3D tilt
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetTiltX = x * 0.12;
      targetTiltY = y * 0.08;
    };

    const handleMouseLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Floating particles
    const particleCount = 24;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.5) * 220,
      z: Math.random() * 80 + 20,
      size: Math.random() * 2.5 + 1.5,
      speed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      time += 0.02;

      // Smooth lerp tilt
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 10;

      ctx.save();
      ctx.translate(cx, cy);

      // Pitch Isometric Projection Matrix
      const pitchWidth = Math.min(width * 0.72, 380);
      const pitchHeight = pitchWidth * 0.58;

      // Draw Stadium Floor Shadow
      const gradFloor = ctx.createRadialGradient(0, 30, 20, 0, 30, pitchWidth * 0.8);
      gradFloor.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
      gradFloor.addColorStop(0.6, 'rgba(0, 0, 0, 0.04)');
      gradFloor.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradFloor;
      ctx.beginPath();
      ctx.ellipse(0, 40, pitchWidth * 0.85, pitchHeight * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Transform 3D Pitch with Tilt
      ctx.transform(1, currentTiltY * 0.5, currentTiltX * 0.4, 0.65, 0, 0);

      // Turf Base Outer Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 16;

      // Green Grass Pitch Surface
      const grassGrad = ctx.createLinearGradient(-pitchWidth / 2, -pitchHeight / 2, pitchWidth / 2, pitchHeight / 2);
      grassGrad.addColorStop(0, '#059669');
      grassGrad.addColorStop(0.5, '#0F766E');
      grassGrad.addColorStop(1, '#047857');
      ctx.fillStyle = grassGrad;

      const r = 16;
      const hw = pitchWidth / 2;
      const hh = pitchHeight / 2;

      ctx.beginPath();
      ctx.moveTo(-hw + r, -hh);
      ctx.lineTo(hw - r, -hh);
      ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
      ctx.lineTo(hw, hh - r);
      ctx.quadraticCurveTo(hw, hh, hw - r, hh);
      ctx.lineTo(-hw + r, hh);
      ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
      ctx.lineTo(-hw, -hh + r);
      ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
      ctx.closePath();
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';

      // Alternating Grass Stripes
      const stripes = 7;
      const stripeW = pitchWidth / stripes;
      for (let i = 0; i < stripes; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(-hw + i * stripeW, -hh, stripeW, pitchHeight);
        }
      }

      // Pitch Boundary Markings (White lines)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2.5;

      // Outer Touchlines
      ctx.strokeRect(-hw + 16, -hh + 14, pitchWidth - 32, pitchHeight - 28);

      // Halfway Line
      ctx.beginPath();
      ctx.moveTo(0, -hh + 14);
      ctx.lineTo(0, hh - 14);
      ctx.stroke();

      // Center Circle
      ctx.beginPath();
      ctx.ellipse(0, 0, pitchWidth * 0.16, pitchHeight * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Center Spot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Boxes Left & Right
      const penW = pitchWidth * 0.16;
      const penH = pitchHeight * 0.45;
      ctx.strokeRect(-hw + 16, -penH / 2, penW, penH);
      ctx.strokeRect(hw - 16 - penW, -penH / 2, penW, penH);

      // Goal Nets (3D Extruded Wireframes)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      // Left Goal
      ctx.strokeRect(-hw + 6, -penH * 0.35, 10, penH * 0.7);
      // Right Goal
      ctx.strokeRect(hw - 16, -penH * 0.35, 10, penH * 0.7);

      // Floodlight Corner Towers
      const corners = [
        { x: -hw + 10, y: -hh + 10 },
        { x: hw - 10, y: -hh + 10 },
        { x: -hw + 10, y: hh - 10 },
        { x: hw - 10, y: hh - 10 },
      ];

      corners.forEach((c) => {
        // Floodlight beam gradient
        const beam = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 45);
        beam.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
        beam.addColorStop(0.3, 'rgba(250, 204, 21, 0.3)');
        beam.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 45, 0, Math.PI * 2);
        ctx.fill();

        // Pole Base
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Animated 3D Floating Ball
      const ballOrbitX = Math.sin(time) * (pitchWidth * 0.28);
      const ballOrbitY = Math.cos(time * 1.2) * (pitchHeight * 0.22);
      const ballHoverZ = Math.abs(Math.sin(time * 2)) * 18 + 6;

      // Ball Shadow on Pitch
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(ballOrbitX, ballOrbitY + 4, 8 - ballHoverZ * 0.15, 5 - ballHoverZ * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball Sphere
      const ballY = ballOrbitY - ballHoverZ;
      const ballGrad = ctx.createRadialGradient(ballOrbitX - 2, ballY - 3, 1, ballOrbitX, ballY, 8);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.6, '#e2e8f0');
      ballGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(ballOrbitX, ballY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();

      // Floating Ambient Particles (foreground sparks)
      ctx.save();
      ctx.translate(cx, cy);
      particles.forEach((p) => {
        p.phase += p.speed;
        const py = p.y + Math.sin(p.phase) * 12;
        ctx.fillStyle = 'rgba(52, 211, 153, 0.65)';
        ctx.beginPath();
        ctx.arc(p.x, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative w-full h-[360px] sm:h-[420px] flex items-center justify-center select-none overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
    </div>
  );
};

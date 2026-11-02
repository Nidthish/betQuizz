/**
 * Lightweight, zero-dependency HTML5 Canvas Confetti Cannon.
 * Fires celebratory particles in QUIZBET brand colors:
 * Purple (#6C5CE7), Orange (#FF7417), Green (#22B978), and Gold (#FFB800).
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
  decay: number;
}

const BRAND_COLORS = [
  "#6C5CE7", // Primary Purple
  "#FF7417", // Secondary Orange
  "#22B978", // Success Green
  "#FFB800", // Trophy Gold
  "#A78BFA", // Light Purple
];

export function triggerWinConfetti() {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = (canvas.width = window.innerWidth * dpr);
  const height = (canvas.height = window.innerHeight * dpr);

  const particles: Particle[] = [];
  const particleCount = Math.min(100, Math.floor(window.innerWidth > 640 ? 90 : 60));

  // Left Cannon (fires up and right)
  for (let i = 0; i < particleCount / 2; i++) {
    const angle = (Math.PI / 180) * (-60 + (Math.random() * 30 - 15));
    const speed = (Math.random() * 12 + 10) * dpr;
    particles.push({
      x: width * 0.1,
      y: height * 0.85,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (Math.random() * 6 + 6) * dpr,
      color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      wobble: Math.random() * 10,
      wobbleSpeed: Math.random() * 0.1 + 0.05,
      opacity: 1,
      decay: Math.random() * 0.008 + 0.007,
    });
  }

  // Right Cannon (fires up and left)
  for (let i = 0; i < particleCount / 2; i++) {
    const angle = (Math.PI / 180) * (-120 + (Math.random() * 30 - 15));
    const speed = (Math.random() * 12 + 10) * dpr;
    particles.push({
      x: width * 0.9,
      y: height * 0.85,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: (Math.random() * 6 + 6) * dpr,
      color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      wobble: Math.random() * 10,
      wobbleSpeed: Math.random() * 0.1 + 0.05,
      opacity: 1,
      decay: Math.random() * 0.008 + 0.007,
    });
  }

  const gravity = 0.35 * dpr;
  const drag = 0.985;
  let animationFrameId: number;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.opacity <= 0) continue;

      p.vx *= drag;
      p.vy *= drag;
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;

      p.rotation += p.rotationSpeed;
      p.wobble += p.wobbleSpeed;
      p.opacity -= p.decay;

      if (p.opacity > 0 && p.y < height + 50) {
        activeCount++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(Math.cos(p.wobble), 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);

        // Draw rectangle confetti particle
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    }

    if (activeCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  }

  animationFrameId = requestAnimationFrame(render);

  // Safety cleanup after 4 seconds
  setTimeout(() => {
    cancelAnimationFrame(animationFrameId);
    if (document.body.contains(canvas)) {
      canvas.remove();
    }
  }, 4000);
}

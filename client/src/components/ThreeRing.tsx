import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Props {
  /** Utilisation ratio 0..1 */
  value?: number;
  size?: number;
}

export default function ThreeRing({ value = 0.74, size = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // ── Lights ─────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const pt = new THREE.PointLight(0x3DA1FF, 1.5, 20);
    pt.position.set(3, 3, 5);
    scene.add(pt);

    // ── Particle ring ──────────────────────────────────────
    const TOTAL   = 120;
    const RADIUS  = 2.8;
    const filled  = Math.round(value * TOTAL);

    const particles: THREE.Mesh[] = [];

    for (let i = 0; i < TOTAL; i++) {
      const angle = (i / TOTAL) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * RADIUS;
      const y = Math.sin(angle) * RADIUS;

      const isOccupied = i < filled;
      const color = isOccupied
        ? new THREE.Color().lerpColors(
            new THREE.Color('#1a4e7a'),
            new THREE.Color('#3DA1FF'),
            i / filled,
          )
        : new THREE.Color('#E2EEF8');

      const geo  = new THREE.SphereGeometry(0.14, 8, 8);
      const mat  = new THREE.MeshPhongMaterial({ color, shininess: 120 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, 0);

      // Occupied particles slightly raised
      if (isOccupied) {
        mesh.scale.setScalar(1.25);
        mesh.position.z = 0.1;
      }

      scene.add(mesh);
      particles.push(mesh);
    }

    // ── Inner glow disc ────────────────────────────────────
    const discGeo = new THREE.CircleGeometry(1.8, 64);
    const discMat = new THREE.MeshBasicMaterial({ color: 0xF4F8FD });
    scene.add(new THREE.Mesh(discGeo, discMat));

    // ── Animate ────────────────────────────────────────────
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);

      // Slow spin
      particles.forEach((p, i) => {
        const baseAngle = (i / TOTAL) * Math.PI * 2;
        const t = Date.now() * 0.0005;
        const angle = baseAngle + t;
        const r = RADIUS;
        p.position.x = Math.cos(angle) * r;
        p.position.y = Math.sin(angle) * r;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [value, size]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div ref={containerRef} style={{ borderRadius: '50%', overflow: 'hidden' }} />
      {/* Center label */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: 'Figtree, sans-serif',
          fontSize: 32,
          fontWeight: 800,
          color: '#0B1C2D',
          lineHeight: 1,
        }}>
          {Math.round(value * 100)}%
        </div>
        <div style={{
          fontFamily: 'Figtree, sans-serif',
          fontSize: 11,
          fontWeight: 500,
          color: '#536778',
          marginTop: 4,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Utilisation
        </div>
      </div>
    </div>
  );
}

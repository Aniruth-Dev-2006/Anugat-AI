import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// ── Types ──────────────────────────────────────────────────────
interface Props {
  /** 6 × 9 matrix: data[day][period] = occupancy ratio 0..1 */
  data?: number[][];
  height?: number;
}

// ── Demo data (realistic-looking timetable occupancy) ──────────
const DEMO: number[][] = [
  [0.88, 1.00, 0.75, 0.94, 0.62, 0.30, 0.50, 0.20, 0.10], // Mon
  [0.95, 0.82, 1.00, 0.72, 0.88, 0.44, 0.60, 0.10, 0.00], // Tue
  [0.70, 0.92, 0.85, 1.00, 0.55, 0.55, 0.42, 0.30, 0.00], // Wed
  [0.80, 0.78, 0.92, 0.88, 0.90, 0.35, 0.72, 0.00, 0.00], // Thu
  [0.65, 0.82, 0.70, 0.92, 0.44, 0.22, 0.35, 0.00, 0.00], // Fri
  [0.40, 0.60, 0.50, 0.30, 0.00, 0.00, 0.00, 0.00, 0.00], // Sat
];

const DAYS    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

// ── Color helper: low = #BFDBFE (blue-200), high = #1a4e7a ─────
function occupancyColor(v: number): THREE.Color {
  const low  = new THREE.Color('#BFDBFE');
  const high = new THREE.Color('#1a4e7a');
  return low.clone().lerp(high, v);
}

export default function ThreeHeatmap({ data = DEMO, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize the flat occupancy values
  const flat = useMemo(
    () => DAYS.map((_, d) => PERIODS.map((_, p) => data[d]?.[p] ?? 0)),
    [data],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF4F8FD);
    scene.fog = new THREE.Fog(0xF4F8FD, 25, 45);

    const w = el.clientWidth;
    const h = el.clientHeight;

    // ── Camera ─────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(12, 10, 14);
    camera.lookAt(5.5, 0, 3.5);

    // ── Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);

    // ── Lights ─────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(12, 20, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x93C5FD, 0.4);
    fillLight.position.set(-10, 5, -5);
    scene.add(fillLight);

    // ── Floor grid ─────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(20, 20, 0xD1E5F7, 0xD1E5F7);
    gridHelper.position.set(4.5, 0, 2.5);
    scene.add(gridHelper);

    // ── Base platform ──────────────────────────────────────
    const platformGeo = new THREE.BoxGeometry(11.2, 0.1, 7.2);
    const platformMat = new THREE.MeshPhongMaterial({ color: 0xE8F3FC });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(4.5, -0.05, 2.5);
    platform.receiveShadow = true;
    scene.add(platform);

    // ── Bars ───────────────────────────────────────────────
    const GAP_X = 1.2;  // period spacing
    const GAP_Z = 1.2;  // day spacing
    const MAX_H = 3.5;

    const bars: { mesh: THREE.Mesh; targetH: number }[] = [];

    for (let d = 0; d < 6; d++) {
      for (let p = 0; p < 9; p++) {
        const occ     = flat[d][p];
        const targetH = Math.max(0.08, occ * MAX_H);

        const geo = new THREE.BoxGeometry(0.75, targetH, 0.75);
        const mat = new THREE.MeshPhongMaterial({
          color:     occupancyColor(occ),
          shininess: 80,
          specular:  new THREE.Color(0xffffff),
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p * GAP_X, targetH / 2, d * GAP_Z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Start flat for entrance animation
        mesh.scale.y = 0.01;
        scene.add(mesh);
        bars.push({ mesh, targetH });
      }
    }

    // ── Axis labels (sprites) ──────────────────────────────
    function makeLabel(text: string): THREE.Sprite {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 48;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#536778';
      ctx.font = 'bold 24px Figtree, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 24);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.2, 0.45, 1);
      return sprite;
    }

    PERIODS.forEach((p, i) => {
      const lbl = makeLabel(p);
      lbl.position.set(i * GAP_X, 0, -0.9);
      scene.add(lbl);
    });

    DAYS.forEach((d, i) => {
      const lbl = makeLabel(d);
      lbl.position.set(-1.0, 0, i * GAP_Z);
      scene.add(lbl);
    });

    // ── Entrance animation ─────────────────────────────────
    let t = 0;
    const ANIM_DURATION = 80; // frames

    // ── Auto-rotate state ──────────────────────────────────
    let autoRotate = true;
    let isDragging = false;
    let lastX = 0;
    let rotY = 0;

    const onMouseEnter = () => { autoRotate = false; };
    const onMouseLeave = () => { autoRotate = true; };
    const onMouseDown  = (e: MouseEvent) => { isDragging = true; lastX = e.clientX; };
    const onMouseUp    = () => { isDragging = false; };
    const onMouseMove  = (e: MouseEvent) => {
      if (!isDragging) return;
      rotY += (e.clientX - lastX) * 0.005;
      lastX = e.clientX;
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove',  onMouseMove);

    // ── Animation loop ─────────────────────────────────────
    let raf: number;
    const pivot = new THREE.Group();
    pivot.position.set(4.5, 0, 2.5);

    // Re-parent bars to pivot for rotation
    bars.forEach(({ mesh }) => {
      mesh.position.x -= 4.5;
      mesh.position.z -= 2.5;
      pivot.add(mesh);
    });
    scene.add(pivot);

    // Move grid & platform to pivot too
    platform.position.set(0, -0.05, 0);
    pivot.add(platform);

    const animate = () => {
      raf = requestAnimationFrame(animate);

      // Entrance: scale bars up
      if (t < ANIM_DURATION) {
        t++;
        const progress = t / ANIM_DURATION;
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        bars.forEach(({ mesh }) => {
          mesh.scale.y = eased;
          mesh.position.y = (mesh.scale.y * (mesh.geometry as THREE.BoxGeometry).parameters.height) / 2;
        });
      }

      // Auto-rotate
      if (autoRotate) {
        pivot.rotation.y += 0.003;
      } else {
        pivot.rotation.y = rotY;
      }

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handler ─────────────────────────────────────
    const onResize = () => {
      if (!el) return;
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup ────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mousedown',  onMouseDown);
      el.removeEventListener('mousemove',  onMouseMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [flat]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: 16, overflow: 'hidden', cursor: 'grab' }}
    />
  );
}

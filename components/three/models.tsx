"use client";

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ───────────── Shared materials ───────────── */

export const tones = {
  panel: "#0e1626",
  frame: "#9aa0a6",
  concrete: "#d6d0c3",
  containerWhite: "#d8d4ca",
  wallPlaster: "#cbb89a",
  wallBrick: "#a4664a",
  wallLime: "#ddd2bc",
  roofIron: "#7c8287",
  roofRust: "#8a5a3e",
  roofDark: "#3e4347",
  pole: "#6f5a45",
  wire: "#2b2a28",
  trunk: "#4a3426",
  canopy: "#7f9364",
  canopy2: "#9aa874",
  rock: "#c9bfae",
  rock2: "#b3a895",
  soil: "#8a5a3c",
} as const;

const matCache = new Map<string, THREE.Material>();
export function stdMat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(opts);
  let m = matCache.get(key) as THREE.MeshStandardMaterial | undefined;
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
    matCache.set(key, m);
  }
  return m;
}

/** Procedural PV cell texture: monocrystalline cells with silver busbars and a frame. */
function makePanelTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 192;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#b9bec4";
  g.fillRect(0, 0, 128, 192);
  const cols = 6;
  const rows = 10;
  const pad = 4;
  const cw = (128 - pad * 2) / cols;
  const ch = (192 - pad * 2) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = pad + i * cw;
      const y = pad + j * ch;
      const grad = g.createLinearGradient(x, y, x + cw, y + ch);
      grad.addColorStop(0, "#1d2b46");
      grad.addColorStop(1, "#111a2c");
      g.fillStyle = grad;
      g.fillRect(x + 0.8, y + 0.8, cw - 1.6, ch - 1.6);
      g.fillStyle = "rgba(200,210,225,0.35)";
      g.fillRect(x + cw / 3, y + 0.8, 0.6, ch - 1.6);
      g.fillRect(x + (2 * cw) / 3, y + 0.8, 0.6, ch - 1.6);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export const panelMaterial = new THREE.MeshPhysicalMaterial({
  color: "#ffffff",
  map: makePanelTexture(),
  roughness: 0.18,
  metalness: 0.35,
  clearcoat: 0.8,
  clearcoatRoughness: 0.1,
});

/* ───────────── Geometry helpers ───────────── */

const geoCache = new Map<string, THREE.BufferGeometry>();

/** Gable roof prism centred on origin; ridge along X. */
export function gableRoof(w: number, d: number, rise: number, overhang = 0.18): THREE.BufferGeometry {
  const key = `roof-${w}-${d}-${rise}-${overhang}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const shape = new THREE.Shape();
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: hw * 2, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-hw, 0, 0);
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}

/** Mono-pitch (lean-to) roof slab, common on modern rural block houses. */
export function monoRoof(w: number, d: number, rise: number, overhang = 0.2): THREE.BufferGeometry {
  const key = `mono-${w}-${d}-${rise}-${overhang}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(w + overhang * 2, 0.06, Math.hypot(d + overhang * 2, rise));
  g.rotateX(Math.atan2(rise, d + overhang * 2));
  geoCache.set(key, g);
  return g;
}

/* ───────────── Solar array ───────────── */

type ArrayProps = {
  rows: number;
  cols: number;
  position?: [number, number, number];
  rotationY?: number;
  rowGap?: number;
  panelW?: number;
  panelD?: number;
  tilt?: number;
  /** Tracker: if provided, the panel tilt follows this ref (radians) each frame. */
  trackRef?: React.RefObject<number>;
  castShadow?: boolean;
};

export function SolarArray({
  rows,
  cols,
  position = [0, 0, 0],
  rotationY = 0,
  rowGap = 2.2,
  panelW = 1.05,
  panelD = 1.7,
  tilt = 0.32,
  trackRef,
  castShadow = false,
}: ArrayProps) {
  const panels = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const count = rows * cols;
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const last = useRef<number>(NaN);

  const layout = (angle: number) => {
    const p = panels.current;
    if (!p) return;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tmp.position.set((c - (cols - 1) / 2) * (panelW + 0.06), 0.95, (r - (rows - 1) / 2) * rowGap);
        // Fixed-tilt arrays pitch about X; trackers roll about the torque tube (also X).
        tmp.rotation.set(trackRef ? angle : -tilt, 0, 0);
        tmp.scale.set(1, 1, 1);
        tmp.updateMatrix();
        p.setMatrixAt(i++, tmp.matrix);
      }
    }
    p.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    layout(trackRef?.current ?? 0);
    const l = legs.current;
    if (l) {
      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c += 2) {
          tmp.position.set((c - (cols - 1) / 2) * (panelW + 0.06), 0.45, (r - (rows - 1) / 2) * rowGap);
          tmp.rotation.set(0, 0, 0);
          tmp.updateMatrix();
          l.setMatrixAt(i++, tmp.matrix);
        }
      }
      l.count = i;
      l.instanceMatrix.needsUpdate = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cols, rowGap, panelW, tilt]);

  useFrame(() => {
    if (!trackRef) return;
    const a = trackRef.current ?? 0;
    if (Math.abs(a - last.current) > 0.002 || Number.isNaN(last.current)) {
      last.current = a;
      layout(a);
    }
  });

  const legCount = rows * Math.ceil(cols / 2);

  return (
    <group position={position} rotation-y={rotationY}>
      <instancedMesh ref={panels} args={[undefined, undefined, count]} castShadow={castShadow} receiveShadow material={panelMaterial}>
        <boxGeometry args={[panelW, 0.05, panelD]} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, legCount]} castShadow={castShadow} material={stdMat(tones.frame, { metalness: 0.7, roughness: 0.4 })}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
      </instancedMesh>
      {/* torque tubes */}
      {Array.from({ length: rows }).map((_, r) => (
        <mesh key={r} position={[0, 0.92, (r - (rows - 1) / 2) * rowGap]} rotation-z={Math.PI / 2} material={stdMat(tones.frame, { metalness: 0.7, roughness: 0.4 })}>
          <cylinderGeometry args={[0.04, 0.04, cols * (panelW + 0.06), 6]} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────── Battery storage container ───────────── */

export function BatteryContainer({
  position = [0, 0, 0],
  rotationY = 0,
  length = 6,
  statusRef,
  castShadow = false,
}: {
  position?: [number, number, number];
  rotationY?: number;
  length?: number;
  /** 0..1 charge level drives the status strip; sign of chargeRef sets colour. */
  statusRef?: React.RefObject<{ soc: number; charging: boolean }>;
  castShadow?: boolean;
}) {
  const strip = useRef<THREE.Mesh>(null);
  const stripMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b1a17", emissive: new THREE.Color("#8fe3a6"), emissiveIntensity: 1.4 }), []);
  useFrame(() => {
    if (!statusRef?.current || !strip.current) return;
    const { soc, charging } = statusRef.current;
    strip.current.scale.x = Math.max(0.04, soc);
    strip.current.position.x = (-length / 2 + 0.3) + ((length - 0.6) * Math.max(0.04, soc)) / 2;
    stripMat.emissive.set(charging ? "#8fe3a6" : "#f0a43a");
  });
  const ribs = Math.floor(length / 0.5);
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.06, 0]} receiveShadow material={stdMat(tones.concrete)}>
        <boxGeometry args={[length + 0.8, 0.12, 3.2]} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow={castShadow} receiveShadow material={stdMat(tones.containerWhite, { roughness: 0.55 })}>
        <boxGeometry args={[length, 2.6, 2.44]} />
      </mesh>
      {Array.from({ length: ribs }).map((_, i) => (
        <mesh key={i} position={[-length / 2 + 0.25 + i * 0.5, 1.42, 1.23]} material={stdMat("#c4c0b6", { roughness: 0.6 })}>
          <boxGeometry args={[0.06, 2.4, 0.03]} />
        </mesh>
      ))}
      {/* HVAC unit */}
      <mesh position={[length / 2 + 0.12, 1.6, 0]} material={stdMat("#b9b5ab")}>
        <boxGeometry args={[0.24, 1.0, 1.4]} />
      </mesh>
      {/* charge strip */}
      <mesh position={[-length / 2 + 0.3, 2.45, 1.235]} material={stdMat("#1b1a17")}>
        <boxGeometry args={[length - 0.6, 0.12, 0.02]} />
      </mesh>
      <mesh ref={strip} position={[0, 2.45, 1.25]} material={stripMat}>
        <boxGeometry args={[length - 0.6, 0.1, 0.02]} />
      </mesh>
    </group>
  );
}

/* ───────────── Buildings ───────────── */

type HouseProps = {
  position?: [number, number, number];
  rotationY?: number;
  w?: number;
  d?: number;
  h?: number;
  wall?: string;
  roof?: string;
  roofType?: "gable" | "mono";
  windowMat?: THREE.Material;
  castShadow?: boolean;
  children?: ReactNode;
};

export function House({
  position = [0, 0, 0],
  rotationY = 0,
  w = 3.2,
  d = 2.6,
  h = 2.3,
  wall = tones.wallPlaster,
  roof = tones.roofIron,
  roofType = "gable",
  windowMat,
  castShadow = false,
  children,
}: HouseProps) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.08, 0]} receiveShadow material={stdMat(tones.concrete)}>
        <boxGeometry args={[w + 0.5, 0.16, d + 0.5]} />
      </mesh>
      <mesh position={[0, h / 2 + 0.16, 0]} castShadow={castShadow} receiveShadow material={stdMat(wall)}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {roofType === "gable" ? (
        <mesh position={[0, h + 0.16, 0]} geometry={gableRoof(w, d, d * 0.32)} castShadow={castShadow} material={stdMat(roof, { metalness: 0.45, roughness: 0.5 })} />
      ) : (
        <mesh position={[0, h + 0.16 + 0.2, 0]} geometry={monoRoof(w, d, 0.4)} castShadow={castShadow} material={stdMat(roof, { metalness: 0.45, roughness: 0.5 })} />
      )}
      {/* door */}
      <mesh position={[-w * 0.18, 0.16 + 0.95, d / 2 + 0.005]} material={stdMat("#3a2a20")}>
        <planeGeometry args={[0.8, 1.9]} />
      </mesh>
      {/* windows */}
      {windowMat && (
        <>
          <mesh position={[w * 0.22, 0.16 + h * 0.58, d / 2 + 0.006]} material={windowMat}>
            <planeGeometry args={[0.75, 0.7]} />
          </mesh>
          <mesh position={[w / 2 + 0.006, 0.16 + h * 0.58, 0]} rotation-y={Math.PI / 2} material={windowMat}>
            <planeGeometry args={[0.7, 0.7]} />
          </mesh>
        </>
      )}
      {children}
    </group>
  );
}

export function School({
  position = [0, 0, 0],
  rotationY = 0,
  windowMat,
  castShadow = false,
}: {
  position?: [number, number, number];
  rotationY?: number;
  windowMat?: THREE.Material;
  castShadow?: boolean;
}) {
  const w = 11;
  const d = 3.6;
  const h = 2.9;
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 0.1, 0.6]} receiveShadow material={stdMat(tones.concrete)}>
        <boxGeometry args={[w + 0.8, 0.2, d + 2]} />
      </mesh>
      <mesh position={[0, h / 2 + 0.2, 0]} castShadow={castShadow} receiveShadow material={stdMat(tones.wallBrick)}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh position={[0, h + 0.2, 0]} geometry={gableRoof(w, d, 1.1, 0.5)} castShadow={castShadow} material={stdMat(tones.roofIron, { metalness: 0.5, roughness: 0.45 })} />
      {/* veranda posts */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + 0.6 + i * ((w - 1.2) / 5), 1.4, d / 2 + 0.55]} material={stdMat("#d9cfbc")}>
          <boxGeometry args={[0.14, 2.6, 0.14]} />
        </mesh>
      ))}
      {windowMat &&
        Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[-w / 2 + 1.3 + i * 2.1, 0.2 + h * 0.56, d / 2 + 0.006]} material={windowMat}>
            <planeGeometry args={[1.2, 0.9]} />
          </mesh>
        ))}
      {/* flag pole */}
      <mesh position={[w / 2 + 1.2, 2.6, 2.2]} material={stdMat(tones.frame, { metalness: 0.6 })}>
        <cylinderGeometry args={[0.04, 0.05, 5.2, 6]} />
      </mesh>
    </group>
  );
}

/* ───────────── Distribution ───────────── */

export function Pole({ position, height = 5.2, castShadow = false }: { position: [number, number, number]; height?: number; castShadow?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow={castShadow} material={stdMat(tones.pole)}>
        <cylinderGeometry args={[0.07, 0.1, height, 6]} />
      </mesh>
      <mesh position={[0, height - 0.3, 0]} material={stdMat(tones.pole)}>
        <boxGeometry args={[1.1, 0.08, 0.08]} />
      </mesh>
    </group>
  );
}

/** Points along a sagging catenary-like curve between two attachment points. */
export function catenary(a: THREE.Vector3, b: THREE.Vector3, sag = 0.35, segments = 16): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

export function Wire({ points, color = tones.wire, opacity = 1 }: { points: THREE.Vector3[]; color?: string; opacity?: number }) {
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }), [color, opacity]);
  const line = useMemo(() => new THREE.Line(geo, mat), [geo, mat]);
  useLayoutEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  return <primitive object={line} />;
}

/* ───────────── Energy flow particles ───────────── */

export type FlowControl = { active: number; speed: number };

/**
 * Small glowing pulses travelling along a path.
 * `control.current.active` (0..1) fades them; `speed` (+/−) sets direction.
 */
export function EnergyFlow({
  points,
  color,
  count = 8,
  size = 0.09,
  control,
}: {
  points: THREE.Vector3[];
  color: string;
  count?: number;
  size?: number;
  control: React.RefObject<FlowControl>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points, false, "centripetal"), [points]);
  const length = useMemo(() => curve.getLength(), [curve]);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, opacity: 1, toneMapped: false, depthWrite: false }),
    [color],
  );
  const phase = useRef(Math.random());
  const shown = useRef(0);
  const p = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const m = mesh.current;
    const ctl = control.current;
    if (!m || !ctl) return;
    shown.current += (ctl.active - shown.current) * Math.min(1, dt * 4);
    const vis = shown.current;
    m.visible = vis > 0.02;
    if (!m.visible) return;
    mat.opacity = vis;
    // Wrap into [0, 1) even after a long frame gap (paused rendering, background tab) or reversed flow.
    const step = (Math.min(dt, 0.1) * ctl.speed * 6) / Math.max(1, length);
    phase.current = (((phase.current + step) % 1) + 1) % 1;
    if (!Number.isFinite(phase.current)) phase.current = 0;
    for (let i = 0; i < count; i++) {
      const t = (phase.current + i / count) % 1;
      curve.getPointAt(t, p);
      tmp.position.copy(p);
      const edge = Math.min(1, t * 8, (1 - t) * 8);
      tmp.scale.setScalar(size * (0.4 + 0.6 * edge));
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  useLayoutEffect(() => () => mat.dispose(), [mat]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} material={mat} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
    </instancedMesh>
  );
}

/* ───────────── Vegetation & rocks ───────────── */

export type Placement = { x: number; y: number; z: number; s: number; r: number };

export function Trees({ items, castShadow = false }: { items: Placement[]; castShadow?: boolean }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y + 1.1 * it.s, it.z);
      o.rotation.set(0, it.r, (it.r % 0.2) - 0.1);
      o.scale.set(it.s, it.s, it.s);
      o.updateMatrix();
      trunks.current?.setMatrixAt(i, o.matrix);
      // Umbrella crown: wide and flat, like msasa / acacia
      o.position.set(it.x, it.y + 2.3 * it.s, it.z);
      o.scale.set(it.s * (1.6 + (it.r % 0.5)), it.s * 0.7, it.s * (1.5 + (it.r % 0.4)));
      o.updateMatrix();
      crowns.current?.setMatrixAt(i, o.matrix);
      c.set(i % 3 === 0 ? tones.canopy2 : tones.canopy).offsetHSL(0, 0, ((i * 37) % 10) / 100 - 0.05);
      crowns.current?.setColorAt(i, c);
    });
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) {
      crowns.current.instanceMatrix.needsUpdate = true;
      if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true;
    }
  }, [items]);
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, items.length]} castShadow={castShadow} material={stdMat(tones.trunk)}>
        <cylinderGeometry args={[0.07, 0.13, 2.3, 5]} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, items.length]} castShadow={castShadow} receiveShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
    </>
  );
}

export function Rocks({ items, castShadow = false }: { items: Placement[]; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.rotation.set(it.r * 0.6, it.r * 3, it.r * 0.3);
      o.scale.set(it.s * 1.15, it.s * 0.85, it.s);
      o.updateMatrix();
      ref.current?.setMatrixAt(i, o.matrix);
      c.set(i % 2 ? tones.rock : tones.rock2).offsetHSL(0, 0, ((i * 53) % 10) / 120);
      ref.current?.setColorAt(i, c);
    });
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    }
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={castShadow} receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.9} flatShading />
    </instancedMesh>
  );
}

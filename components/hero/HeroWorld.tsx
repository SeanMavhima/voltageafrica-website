"use client";

/**
 * The homepage "living world": an art-directed, real-time landscape of a
 * community-scale energy system. Illustrative only. It depicts a concept, not
 * an operating installation, and its energy flows are simulated.
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { fbm, rng, smooth } from "@/components/three/noise";
import { BatteryContainer, EnergyFlow, House, Pole, Rocks, School, SolarArray, Trees, Wire, catenary, stdMat, tones, type FlowControl, type Placement } from "@/components/three/models";

import { CHAPTER_ORDER, type ChapterId } from "./chapters";

/** Camera focus and label pin for each story chapter. */
const FOCUS: Record<ChapterId, { target: [number, number, number]; offset: [number, number, number]; pin: [number, number, number] }> = {
  solar: { target: [-14.5, 1, -3], offset: [-16, 16, 30], pin: [-14.5, 3.6, -3] },
  battery: { target: [-2.6, 1.4, -4.5], offset: [12, 9, 20], pin: [-2.6, 4.4, -3.4] },
  intelligence: { target: [-3.5, 2.5, -9], offset: [16, 11, 22], pin: [-6, 7.2, -11.2] },
  distribution: { target: [9, 3.5, -4.6], offset: [10, 12, 28], pin: [10.8, 6.8, -4.6] },
  community: { target: [9, 1.5, 0], offset: [20, 14, 30], pin: [8.6, 5.2, -0.2] },
};

const HOME_TARGET = new THREE.Vector3(2, 3.2, -3);
const HOME_RADIUS = 60;
const HOME_HEIGHT = 12.5;

/* ───────────── Time-of-day palette (golden hour → blue hour) ───────────── */

type Palette = { zenith: string; horizon: string; fog: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; glow: number; night: number };
const KEYS: [number, Palette][] = [
  [14.5, { zenith: "#8eaed3", horizon: "#efe6d4", fog: "#e8dcc4", sun: "#fff1d6", sunI: 2.6, hemiSky: "#f1ece0", hemiGround: "#a48e6a", hemiI: 1.05, glow: 0.35, night: 0 }],
  [17.2, { zenith: "#8fa9c9", horizon: "#f4d9b0", fog: "#e9d2aa", sun: "#ffc27a", sunI: 2.4, hemiSky: "#f3dcc0", hemiGround: "#9a7b54", hemiI: 0.9, glow: 0.8, night: 0.05 }],
  [18.1, { zenith: "#6a7ea8", horizon: "#f1b585", fog: "#d8a98a", sun: "#ff9a4e", sunI: 1.5, hemiSky: "#d9a988", hemiGround: "#6d5640", hemiI: 0.6, glow: 1, night: 0.45 }],
  [18.8, { zenith: "#2f3d68", horizon: "#d99a7c", fog: "#8a7078", sun: "#ff8a4c", sunI: 0.45, hemiSky: "#9a8aa2", hemiGround: "#4d4038", hemiI: 0.75, glow: 0.8, night: 0.82 }],
  [19.6, { zenith: "#1b2440", horizon: "#5b5a78", fog: "#454861", sun: "#8ea0d8", sunI: 0.25, hemiSky: "#5d6a92", hemiGround: "#2b2a30", hemiI: 0.62, glow: 0.2, night: 1 }],
];

const ca = new THREE.Color();
const cb = new THREE.Color();
function lerpPalette(hour: number, out: { [K in keyof Palette]: Palette[K] extends string ? THREE.Color : number }) {
  let i = 0;
  while (i < KEYS.length - 2 && hour > KEYS[i + 1][0]) i++;
  const [h0, p0] = KEYS[i];
  const [h1, p1] = KEYS[i + 1];
  const t = THREE.MathUtils.clamp((hour - h0) / (h1 - h0), 0, 1);
  for (const k of Object.keys(p0) as (keyof Palette)[]) {
    const a = p0[k];
    const b = p1[k];
    if (typeof a === "string") (out[k] as THREE.Color).copy(ca.set(a)).lerp(cb.set(b as string), t);
    else (out[k] as number) = a + ((b as number) - a) * t;
  }
}

/* ───────────── Terrain ───────────── */

/** Height of the land: flat where the community stands, rolling hills and kopje ridges beyond. */
export function heightAt(x: number, z: number) {
  const r = Math.hypot(x, z + 2);
  const open = smooth(32, 90, r);
  const rolling = (fbm(x * 0.012, z * 0.012, 4, 3) - 0.45) * 13 * open;
  const ridge = smooth(170, 340, r) * 34 * Math.pow(fbm(x * 0.006 + 3, z * 0.006, 3, 7), 1.4);
  const micro = (fbm(x * 0.08, z * 0.08, 2, 11) - 0.5) * 0.5 * (0.3 + open);
  return rolling + ridge + micro;
}

function Terrain() {
  const geo = useMemo(() => {
    const size = 1100;
    const seg = 180;
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const gold = new THREE.Color("#ad9a6c");
    const straw = new THREE.Color("#c4b48a");
    const soil = new THREE.Color("#9a7a58");
    const green = new THREE.Color("#7c8a5c");
    const dark = new THREE.Color("#5c6a47");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);
      const n = fbm(x * 0.03, z * 0.03, 3, 5);
      const m = fbm(x * 0.009, z * 0.009, 3, 9);
      c.copy(gold).lerp(straw, smooth(0.35, 0.7, n));
      c.lerp(green, smooth(0.5, 0.78, m) * 0.85);
      c.lerp(dark, smooth(0.66, 0.9, m) * 0.6);
      c.lerp(soil, smooth(0.62, 0.8, fbm(x * 0.05 + 9, z * 0.05, 2, 13)) * 0.35);
      // Valleys hold moisture: greener low ground, paler crests
      c.lerp(dark, smooth(1.5, -5, y) * 0.45);
      c.lerp(straw, smooth(6, 16, y) * 0.35);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {/* village tracks */}
      <mesh position={[8, 0.06, -3.2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[60, 1.7]} />
        <meshStandardMaterial color="#d9c49c" roughness={1} />
      </mesh>
      <mesh position={[6.5, 0.06, 4]} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} receiveShadow>
        <planeGeometry args={[15, 1.3]} />
        <meshStandardMaterial color="#d9c49c" roughness={1} />
      </mesh>
    </group>
  );
}

/* ───────────── Sky dome ───────────── */

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFrag = /* glsl */ `
  uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uGlow;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.01, 0.32, h), 0.85));
    float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    float band = exp(-abs(h) * 14.0);
    col += uSun * (pow(s, 4.0) * 0.28 * (0.4 + band) + pow(s, 48.0) * 0.5 + pow(s, 1400.0) * 3.0) * uGlow;
    col = mix(col, uHorizon * 0.92, smoothstep(0.02, -0.2, h));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ───────────── The world ───────────── */

type WorldProps = {
  hourRef: React.RefObject<number>;
  focus: ChapterId | null;
  pinEls: React.RefObject<Partial<Record<ChapterId, HTMLElement | null>>>;
  quality: "high" | "low";
  interactive: boolean;
  reducedMotion: boolean;
  /** 0..1 as the hero scrolls away; the camera rises and pulls back. */
  scrollRef: React.RefObject<number>;
  /** Renders a fixed composed frame (used to produce still images). */
  still?: { cam: [number, number, number]; target: [number, number, number] } | null;
  onReady: () => void;
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function World({ hourRef, focus, pinEls, quality, interactive, reducedMotion, scrollRef, still, onReady }: WorldProps) {
  const high = quality === "high";
  const { camera, scene, size, gl } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const fly = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const idleSince = useRef(0);
  const frames = useRef(0);
  const proj = useMemo(() => new THREE.Vector3(), []);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const track = useRef(0);
  const battery = useRef({ soc: 0.82, charging: true });

  const pal = useMemo(
    () => ({ zenith: new THREE.Color(), horizon: new THREE.Color(), fog: new THREE.Color(), sun: new THREE.Color(), sunI: 0, hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiI: 0, glow: 0, night: 0 }),
    [],
  );
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(1, 0.2, 0) }, uGlow: { value: 1 } },
      }),
    [],
  );
  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1c10", emissive: new THREE.Color("#ffb35c"), emissiveIntensity: 0, roughness: 0.4 }), []);
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2216", emissive: new THREE.Color("#ffcf8f"), emissiveIntensity: 0 }), []);
  const beaconMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b1a17", emissive: new THREE.Color("#8fe3a6"), emissiveIntensity: 1.2 }), []);
  useEffect(
    () => () => {
      skyMat.dispose();
      windowMat.dispose();
      lampMat.dispose();
      beaconMat.dispose();
    },
    [skyMat, windowMat, lampMat, beaconMat],
  );

  useEffect(() => {
    scene.fog = new THREE.Fog("#e8dcc4", 60, 430);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Flow controllers (illustrative)
  const fPV = useRef<FlowControl>({ active: 1, speed: 1 });
  const fBat = useRef<FlowControl>({ active: 1, speed: 1 });
  const fTrunk = useRef<FlowControl>({ active: 1, speed: 1 });
  const fBranch = useRef<FlowControl>({ active: 1, speed: 1 });

  const net = useMemo(() => {
    const H = 5;
    const poles: Record<string, THREE.Vector3> = {
      P0: V(1.5, 0, -4.6),
      P1: V(6, 0, -4.6),
      P2: V(10.8, 0, -4.6),
      P3: V(15.6, 0, -4.6),
      P4: V(10.8, 0, -8.8),
      P5: V(7.6, 0, 1.2),
      P6: V(7.6, 0, 5.6),
      P7: V(16.4, 0, 0.6),
      P8: V(20.4, 0, -4.6),
      P9: V(25.2, 0, -4.6),
    };
    const top = (k: string) => V(poles[k].x, H - 0.25, poles[k].z);
    const chain = (pts: THREE.Vector3[], sag = 0.35) => pts.slice(0, -1).flatMap((p, i) => catenary(p, pts[i + 1], sag, 12).slice(i === 0 ? 0 : 1));
    const spans = (pts: THREE.Vector3[]) => pts.slice(0, -1).map((p, i) => catenary(p, pts[i + 1], 0.35, 12));
    const hubOut = V(-1.6, 2.2, -7.6);
    const trunk = [hubOut, top("P0"), top("P1"), top("P2"), top("P3"), top("P8"), top("P9")];
    const branches = [
      [top("P2"), top("P4"), V(11.5, 3.6, -10.6)],
      [top("P1"), V(4.2, 2.5, 0.6)],
      [top("P2"), V(8.6, 2.5, 0.8)],
      [top("P3"), V(13.4, 2.5, 0.4)],
      [top("P1"), top("P5"), top("P6"), V(11.2, 3.2, 6.6)],
      [top("P3"), top("P7"), V(18.2, 2.6, 1.6)],
      [top("P9"), V(27, 2.5, -0.8)],
      [top("P8"), V(21.6, 2.5, -8.6)],
    ];
    return {
      poles,
      spanSets: [trunk, ...branches].flatMap(spans),
      paths: {
        pv: [V(-8.4, 1.1, -3), V(-6.2, 0.4, -5.2), V(-5, 0.4, -8.5), V(-4.4, 1.2, -8.5)],
        bat: [V(-3, 0.4, -7.1), V(-3, 0.3, -5.6), V(-2.6, 0.8, -4.7)],
        trunk: chain(trunk),
        branches: branches.map((b) => chain(b, 0.25)),
      },
    };
  }, []);

  const scatter = useMemo(() => {
    const r = rng(23);
    const nearOccupied = (x: number, z: number) =>
      (x > -24 && x < -6 && z > -11 && z < 5) ||
      (x > -7 && x < 1.5 && z > -12 && z < -1) ||
      (x > 3 && x < 30 && z > -16 && z < 9.5) ||
      (x > -14 && x < 2 && z > 3 && z < 12) ||
      Math.abs(z + 3.2) < 2 ||
      (Math.abs(x - 6.5) < 1.4 && z > -3 && z < 12);
    const trees: Placement[] = [];
    let g = 0;
    const target = high ? 420 : 200;
    while (trees.length < target && g++ < 20000) {
      const a = r() * Math.PI * 2;
      const d = 8 + Math.pow(r(), 0.75) * 230;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d - 2;
      if (nearOccupied(x, z)) continue;
      // Woodland clusters: density follows a low-frequency field
      if (fbm(x * 0.02, z * 0.02, 2, 21) < 0.42 && r() > 0.25) continue;
      trees.push({ x, y: heightAt(x, z) - 0.1, z, s: 0.7 + r() * 0.9 + (d > 120 ? 0.6 : 0), r: r() * 6 });
    }
    const rocks: Placement[] = [];
    // Granite kopjes on the surrounding hills
    for (let k = 0; k < (high ? 14 : 8); k++) {
      const a = r() * Math.PI * 2;
      const d = 60 + r() * 170;
      const cx = Math.cos(a) * d;
      const cz = Math.sin(a) * d;
      const n = 4 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const s = 1.2 + r() * (d > 140 ? 5 : 3);
        const x = cx + (r() - 0.5) * 9;
        const z = cz + (r() - 0.5) * 9;
        rocks.push({ x, y: heightAt(x, z) + s * 0.35, z, s, r: r() * 6 });
      }
    }
    for (const [cx, cz] of [
      [-26, 13],
      [28, -18],
      [-28, -18],
    ]) {
      for (let i = 0; i < 5; i++) {
        const s = 0.6 + r() * 1.5;
        const x = cx + (r() - 0.5) * 5;
        const z = cz + (r() - 0.5) * 4;
        rocks.push({ x, y: heightAt(x, z) + s * 0.4, z, s, r: r() * 6 });
      }
    }
    // Scattered homesteads beyond the core, also on the network
    const homes: { x: number; z: number; rot: number; v: number }[] = [
      { x: 8.6, z: -0.2, rot: -0.06, v: 0 },
      { x: 13.4, z: -0.8, rot: 0.08, v: 1 },
      { x: 3.6, z: -7.3, rot: -0.06, v: 2 },
      { x: 4.4, z: 6.6, rot: 0.1, v: 1 },
      { x: 16.6, z: -7.6, rot: -0.04, v: 0 },
      { x: 21.6, z: -9.2, rot: 0.2, v: 2 },
      { x: 27, z: -1.2, rot: -0.15, v: 1 },
      { x: 23.5, z: 4.8, rot: 0.3, v: 0 },
    ];
    return { trees, rocks, homes };
  }, [high]);

  const homeStyles = [
    [tones.wallBrick, tones.roofRust, "gable"],
    [tones.wallLime, tones.roofDark, "mono"],
    ["#b89272", tones.roofIron, "gable"],
  ] as const;

  /* Fly to a chapter */
  useEffect(() => {
    const c = controls.current;
    if (!c || still) return;
    if (!focus) {
      fly.current = null;
      idleSince.current = performance.now() - 4000;
      return;
    }
    const f = FOCUS[focus];
    const target = V(...f.target);
    fly.current = { pos: target.clone().add(V(...f.offset).multiplyScalar(1.3)), target };
  }, [focus, still]);

  const angle = useRef(0.62);
  const sunDir = useMemo(() => new THREE.Vector3(), []);
  const home = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const hour = hourRef.current ?? 17.4;
    lerpPalette(hour, pal);

    // Sun: low in the west at golden hour
    // Low western sun through golden hour; sets around 18:35
    const elev = THREE.MathUtils.clamp((18.55 - hour) * 0.11, -0.1, 0.7);
    const theta = Math.PI / 2 + Math.acos(THREE.MathUtils.clamp(elev / 0.9, -1, 1));
    sunDir.set(-1, elev, -0.42).normalize();
    if (sun.current) {
      sun.current.position.copy(sunDir).multiplyScalar(120);
      sun.current.color.copy(pal.sun);
      sun.current.intensity = pal.sunI;
    }
    if (hemi.current) {
      hemi.current.color.copy(pal.hemiSky);
      hemi.current.groundColor.copy(pal.hemiGround);
      hemi.current.intensity = pal.hemiI;
    }
    skyMat.uniforms.uZenith.value.copy(pal.zenith);
    skyMat.uniforms.uHorizon.value.copy(pal.horizon);
    skyMat.uniforms.uSun.value.copy(pal.sun);
    skyMat.uniforms.uSunDir.value.copy(sunDir);
    skyMat.uniforms.uGlow.value = pal.glow;
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(pal.fog);
    gl.toneMappingExposure = 1.0 + pal.night * 0.15;
    scene.environmentIntensity = 0.04 + 0.6 * Math.pow(1 - pal.night, 2);

    // Homes and lamps light up as the day goes
    windowMat.emissiveIntensity = 0.05 + 3.2 * pal.night;
    lampMat.emissiveIntensity = 3.4 * pal.night;

    // Trackers follow the sun and stow at night
    const want = pal.night < 0.6 ? THREE.MathUtils.clamp(-(Math.PI / 2 - theta) * 0.9, -0.85, 0.85) : 0;
    track.current += (want - track.current) * Math.min(1, dt * 1.5);

    // Illustrative flows: solar charges storage by day; storage serves homes after dark
    const dayFrac = 1 - pal.night;
    const speed = reducedMotion ? 0.3 : 1;
    fPV.current.active = smooth(0.15, 0.6, dayFrac);
    fPV.current.speed = speed;
    battery.current.charging = dayFrac > 0.5;
    battery.current.soc = 0.55 + 0.35 * dayFrac;
    fBat.current.active = 1;
    fBat.current.speed = (dayFrac > 0.5 ? 1 : -1) * speed;
    fTrunk.current.speed = speed * 0.8;
    fBranch.current.active = 0.3 + 0.5 * pal.night;
    fBranch.current.speed = speed * 0.8;

    // Camera
    const c = controls.current;
    if (still) {
      camera.position.set(...still.cam);
      c?.target.set(...still.target);
      c?.update();
    } else if (c) {
      if (fly.current) {
        const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 1.8);
        camera.position.lerp(fly.current.pos, k);
        c.target.lerp(fly.current.target, k);
        c.update();
      } else {
        const idle = performance.now() - idleSince.current > 6000;
        if (idle && !reducedMotion) {
          // Slow cinematic drift around the community; rise as the hero scrolls away
          angle.current += dt * 0.022;
          const s = scrollRef.current ?? 0;
          const t = state.clock.elapsedTime;
          const radius = HOME_RADIUS + s * 40 + Math.sin(t * 0.07) * 4;
          home.set(HOME_TARGET.x + Math.cos(angle.current) * radius, HOME_HEIGHT + s * 26 + Math.sin(t * 0.05) * 2.5, HOME_TARGET.z + Math.sin(angle.current) * radius);
          const k = 1 - Math.exp(-dt * 0.8);
          camera.position.lerp(home, k);
          c.target.lerp(HOME_TARGET, k);
          c.update();
        } else if (idle && reducedMotion && camera.position.distanceTo(HOME_TARGET) > 160) {
          camera.position.set(HOME_TARGET.x + Math.cos(angle.current) * HOME_RADIUS, HOME_HEIGHT, HOME_TARGET.z + Math.sin(angle.current) * HOME_RADIUS);
        }
      }
    }

    // Lens shift (like an architectural camera): on wide screens the village sits
    // right of the headline; when a chapter panel opens on the right, it moves left.
    const persp = camera as THREE.PerspectiveCamera;
    const wantOff = !still && size.width >= 1024 ? (focus ? 0.14 : -0.2) * persp.filmGauge : 0;
    if (Math.abs(persp.filmOffset - wantOff) > 0.005) {
      persp.filmOffset += (wantOff - persp.filmOffset) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 2));
      persp.updateProjectionMatrix();
    }

    // Project chapter pins to screen space
    const els = pinEls.current;
    if (els) {
      for (const id of CHAPTER_ORDER) {
        const el = els[id];
        if (!el) continue;
        proj.set(...FOCUS[id].pin).project(camera);
        const x = (proj.x * 0.5 + 0.5) * size.width;
        const y = (-proj.y * 0.5 + 0.5) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = proj.z < 1 && x > 0 && x < size.width && y > 60 && y < size.height - 40 ? "1" : "0";
      }
    }

    if (frames.current < 3 && ++frames.current === 3) onReady();
  });

  const FLOW_DC = "#e8902a";
  const FLOW_AC = "#f4c97a";

  return (
    <>
      <mesh material={skyMat} renderOrder={-1}>
        <sphereGeometry args={[900, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} intensity={1} />
      {/* Sky-tinted reflections: lets the panel glass and metal pick up the golden light */}
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.6} color="#ffd3a1" position={[-60, 8, -20]} scale={[120, 18, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#a9bddb" position={[0, 60, 0]} rotation-x={Math.PI / 2} scale={[160, 160, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#e9d5b5" position={[60, 10, 30]} scale={[120, 20, 1]} target={[0, 0, 0]} />
      </Environment>
      <directionalLight
        ref={sun}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />

      <OrbitControls
        ref={controls}
        makeDefault
        enabled={interactive && !still}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.45}
        minPolarAngle={0.95}
        maxPolarAngle={1.36}
        target={[HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z]}
        onStart={() => {
          fly.current = null;
          idleSince.current = performance.now();
        }}
        onEnd={() => {
          idleSince.current = performance.now();
          const p = camera.position.clone().sub(HOME_TARGET);
          angle.current = Math.atan2(p.z, p.x);
        }}
      />

      <Terrain />

      {/* Generation */}
      <SolarArray rows={6} cols={12} position={[-15, 0, -3]} rotationY={Math.PI / 2} rowGap={2.5} panelW={1.1} panelD={1.8} trackRef={track} castShadow={high} />

      {/* Power station: control room, inverters, communications mast */}
      <group position={[-3, 0, -8.5]}>
        <mesh position={[0, 0.08, 0]} receiveShadow material={stdMat(tones.concrete)}>
          <boxGeometry args={[5, 0.16, 3.6]} />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow={high} receiveShadow material={stdMat("#d9d2c2", { roughness: 0.6 })}>
          <boxGeometry args={[4, 2.4, 2.8]} />
        </mesh>
        <mesh position={[0, 2.62, 0]} castShadow={high} material={stdMat(tones.roofDark, { metalness: 0.4, roughness: 0.5 })}>
          <boxGeometry args={[4.4, 0.14, 3.2]} />
        </mesh>
        <mesh position={[1, 1.2, 1.405]} material={windowMat}>
          <planeGeometry args={[0.9, 0.7]} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh key={i} position={[2.5, 0.85, -0.6 + i * 1.1]} castShadow={high} material={stdMat("#8f948f", { metalness: 0.4, roughness: 0.4 })}>
            <boxGeometry args={[0.6, 1.4, 0.9]} />
          </mesh>
        ))}
      </group>
      <group position={[-6, 0, -11.2]}>
        <mesh position={[0, 3.2, 0]} castShadow={high} material={stdMat(tones.frame, { metalness: 0.7, roughness: 0.35 })}>
          <cylinderGeometry args={[0.06, 0.12, 6.4, 6]} />
        </mesh>
        <mesh position={[0.25, 5.6, 0]} material={stdMat("#d9d6ce")}>
          <boxGeometry args={[0.1, 0.8, 0.3]} />
        </mesh>
        <mesh position={[0, 6.45, 0]} material={beaconMat}>
          <sphereGeometry args={[0.09, 8, 6]} />
        </mesh>
      </group>

      {/* Storage */}
      <BatteryContainer position={[-2.6, 0, -3.4]} length={5} statusRef={battery} castShadow={high} />

      {/* Distribution */}
      {Object.values(net.poles).map((p, i) => (
        <group key={i}>
          <Pole position={[p.x, 0, p.z]} height={5} castShadow={high} />
          <mesh position={[p.x + 0.35, 4.3, p.z]} material={lampMat}>
            <boxGeometry args={[0.3, 0.08, 0.16]} />
          </mesh>
        </group>
      ))}
      {net.spanSets.map((s, i) => (
        <Wire key={i} points={s} />
      ))}

      {/* Community */}
      <House position={[4.2, 0, -0.6]} w={3.2} d={2.6} wall={tones.wallPlaster} roof={tones.roofIron} windowMat={windowMat} castShadow={high} />
      {scatter.homes.map((h, i) => {
        const [wall, roof, type] = homeStyles[h.v];
        return <House key={i} position={[h.x, 0, h.z]} rotationY={h.rot} w={3} d={2.5} wall={wall} roof={roof} roofType={type} windowMat={windowMat} castShadow={high} />;
      })}
      <School position={[11.5, 0, -12.5]} windowMat={windowMat} castShadow={high} />

      {/* Productive use: mill and cold room */}
      <group position={[12.5, 0, 7.4]}>
        <mesh position={[0, 0.08, 0]} receiveShadow material={stdMat(tones.concrete)}>
          <boxGeometry args={[7.4, 0.16, 4.6]} />
        </mesh>
        <mesh position={[-1.4, 1.5, 0]} castShadow={high} receiveShadow material={stdMat("#b5a588")}>
          <boxGeometry args={[3.6, 2.8, 3.4]} />
        </mesh>
        <mesh position={[-1.4, 2.9, 0]} rotation-z={0.12} castShadow={high} material={stdMat(tones.roofIron, { metalness: 0.5, roughness: 0.45 })}>
          <boxGeometry args={[4.2, 0.08, 3.9]} />
        </mesh>
        <mesh position={[2.1, 1.25, 0]} castShadow={high} receiveShadow material={stdMat("#e4e2dc", { roughness: 0.4 })}>
          <boxGeometry args={[2.6, 2.3, 2.8]} />
        </mesh>
        <mesh position={[2.1, 1.9, 1.405]} material={windowMat}>
          <planeGeometry args={[1.2, 0.3]} />
        </mesh>
      </group>

      {/* Water: tower and irrigated plots */}
      <group position={[-1.6, 0, 6.2]}>
        {[
          [-0.9, -0.9],
          [0.9, -0.9],
          [-0.9, 0.9],
          [0.9, 0.9],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 2.4, z]} castShadow={high} material={stdMat(tones.frame, { metalness: 0.6, roughness: 0.4 })}>
            <boxGeometry args={[0.12, 4.8, 0.12]} />
          </mesh>
        ))}
        <mesh position={[0, 5.6, 0]} castShadow={high} material={stdMat("#9aa29c", { metalness: 0.45, roughness: 0.42 })}>
          <cylinderGeometry args={[1.25, 1.25, 1.9, 20]} />
        </mesh>
      </group>
      <group position={[-10.5, 0.06, 8.4]}>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[-5 + i * 1.25, 0.1, 0]} receiveShadow material={stdMat(i % 2 ? "#5f7a35" : "#6f8a3c")}>
            <boxGeometry args={[0.7, 0.22, 5.6]} />
          </mesh>
        ))}
      </group>

      {/* Shops */}
      <group position={[18.6, 0, 1.6]} rotation-y={-Math.PI / 2}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[-2.2 + i * 2.2, 0, 0]}>
            <mesh position={[0, 1.2, 0]} castShadow={high} receiveShadow material={stdMat(["#c9a56b", "#a98463", "#d7cbb4"][i])}>
              <boxGeometry args={[2.1, 2.2, 2.6]} />
            </mesh>
            <mesh position={[0, 2.0, 1.6]} rotation-x={0.35} material={stdMat(["#7c3d26", "#3d4a52", "#8a6a2e"][i])}>
              <boxGeometry args={[2.0, 0.06, 1.0]} />
            </mesh>
            <mesh position={[0, 1.0, 1.31]} material={windowMat}>
              <planeGeometry args={[1.3, 1.2]} />
            </mesh>
          </group>
        ))}
      </group>

      <Trees items={scatter.trees} castShadow={high} />
      <Rocks items={scatter.rocks} castShadow={high} />

      <EnergyFlow points={net.paths.pv} color={FLOW_DC} count={10} size={0.13} control={fPV} />
      <EnergyFlow points={net.paths.bat} color={FLOW_DC} count={6} size={0.13} control={fBat} />
      <EnergyFlow points={net.paths.trunk} color={FLOW_AC} count={18} size={0.09} control={fTrunk} />
      {net.paths.branches.map((b, i) => (
        <EnergyFlow key={i} points={b} color={FLOW_AC} count={3} size={0.075} control={fBranch} />
      ))}
    </>
  );
}

function FrameGate({ active }: { active: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    setFrameloop(active ? "always" : "never");
  }, [active, setFrameloop]);
  return null;
}

export default function HeroWorld(props: WorldProps & { active: boolean }) {
  const { quality, active, ...rest } = props;
  return (
    <Canvas
      shadows={quality === "high" ? "soft" : false}
      dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: !!props.still }}
      camera={{ fov: 32, near: 1, far: 2000, position: [HOME_TARGET.x + Math.cos(0.62) * HOME_RADIUS, HOME_HEIGHT, HOME_TARGET.z + Math.sin(0.62) * HOME_RADIUS] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      aria-hidden
      tabIndex={-1}
    >
      <FrameGate active={active} />
      <World quality={quality} {...rest} />
    </Canvas>
  );
}

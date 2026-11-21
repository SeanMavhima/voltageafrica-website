"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { fbm, rng, smooth } from "@/components/three/noise";
import {
  BatteryContainer,
  EnergyFlow,
  House,
  Pole,
  Rocks,
  School,
  SolarArray,
  Trees,
  Wire,
  catenary,
  stdMat,
  tones,
  type FlowControl,
  type Placement,
} from "@/components/three/models";
import { daylight, sampleAt } from "@/lib/sim/energy";
import { gridComponents, type ComponentId } from "@/lib/data/microgrid";

export type SceneCommands = { zoom: (factor: number) => void; reset: () => void };

type Props = {
  hourRef: React.RefObject<number>;
  flowOn: boolean;
  selected: ComponentId | null;
  onSelect: (id: ComponentId | null) => void;
  /** DOM label elements, positioned each frame by projecting 3D pin points. */
  labelEls: React.RefObject<Partial<Record<ComponentId, HTMLElement | null>>>;
  quality: "high" | "low";
  commands: React.RefObject<SceneCommands | null>;
  active: boolean;
  allowZoom: boolean;
  interactive: boolean;
  reducedMotion: boolean;
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* Focus targets for camera fly-to */
const FOCUS: Record<ComponentId, { target: [number, number, number]; dist: number; pin: [number, number, number] }> = {
  solar: { target: [-14.5, 1, -3], dist: 44, pin: [-14.5, 3.4, -3] },
  inverter: { target: [-3, 1.2, -8.5], dist: 26, pin: [-3, 4.4, -8.5] },
  battery: { target: [-2.5, 1.4, -3.4], dist: 26, pin: [-2.5, 4.2, -3.4] },
  distribution: { target: [8, 3, -4.5], dist: 41, pin: [8.5, 6.6, -4.6] },
  household: { target: [4.2, 1.3, -0.6], dist: 22, pin: [4.2, 4.6, -0.6] },
  school: { target: [11.5, 1.6, -12.5], dist: 34, pin: [11.5, 5.6, -12.5] },
  productive: { target: [12.5, 1.4, 7.4], dist: 27, pin: [12.5, 5, 7.4] },
  water: { target: [-3, 2, 7], dist: 31, pin: [-1.6, 7.6, 6.2] },
  business: { target: [18.6, 1.2, 1.6], dist: 26, pin: [18.6, 4.2, 1.6] },
  meters: { target: [8.5, 1.2, -1], dist: 31, pin: [8.6, 3.8, -0.2] },
};

const HOME_CAM = V(45, 40, 52);
const HOME_TARGET = V(1, -1, -1.5);

/* ───────────── Diorama base ───────────── */

function Plinth() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(48, 31, 96, 62);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -1.5);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const soil = new THREE.Color("#c8ab84");
    const dry = new THREE.Color("#d8c7a2");
    const grass = new THREE.Color("#a9b58a");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const edge = Math.min(24 - Math.abs(x), 15.5 - Math.abs(z + 1.5));
      const n = fbm(x * 0.12, z * 0.12, 3, 4);
      const y = (n - 0.5) * 0.35 * smooth(0, 3, edge) + smooth(6, 0, Math.hypot(x + 20, z - 11)) * 1.2 + smooth(6, 0, Math.hypot(x - 20, z + 14)) * 1.0;
      pos.setY(i, y);
      c.copy(soil).lerp(dry, smooth(0.35, 0.7, n));
      c.lerp(grass, smooth(0.55, 0.8, fbm(x * 0.05, z * 0.05, 2, 9)) * 0.75);
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
      {/* model base */}
      <mesh position={[0, -1.05, -1.5]} receiveShadow>
        <boxGeometry args={[48.4, 2, 31.4]} />
        <meshStandardMaterial color="#ebe5d8" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.06, -1.5]}>
        <boxGeometry args={[48.6, 0.04, 31.6]} />
        <meshStandardMaterial color="#d7cebd" roughness={0.9} />
      </mesh>
      {/* road */}
      <mesh position={[8, 0.05, -3.2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[34, 1.6]} />
        <meshStandardMaterial color="#e2d3b4" roughness={1} />
      </mesh>
      <mesh position={[6.5, 0.05, 3.5]} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} receiveShadow>
        <planeGeometry args={[13, 1.3]} />
        <meshStandardMaterial color="#e2d3b4" roughness={1} />
      </mesh>
    </group>
  );
}

/* ───────────── Selection wrapper ───────────── */

function Selectable({
  id,
  selected,
  onSelect,
  hovered,
  setHovered,
  ring,
  children,
  interactive,
}: {
  id: ComponentId;
  selected: ComponentId | null;
  onSelect: (id: ComponentId | null) => void;
  hovered: ComponentId | null;
  setHovered: (id: ComponentId | null) => void;
  ring: { pos: [number, number, number]; r: number };
  children: ReactNode;
  interactive: boolean;
}) {
  const isSel = selected === id;
  const isHov = hovered === id;
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#e8a344").multiplyScalar(1.15), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }), []);
  useFrame((state) => {
    const target = isSel ? 0.75 + Math.sin(state.clock.elapsedTime * 3) * 0.2 : isHov ? 0.45 : 0;
    ringMat.opacity += (target - ringMat.opacity) * 0.15;
    if (ringRef.current) ringRef.current.visible = ringMat.opacity > 0.01;
  });
  useEffect(() => () => ringMat.dispose(), [ringMat]);
  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(id);
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          setHovered(null);
          document.body.style.cursor = "";
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(isSel ? null : id);
        },
      }
    : {};
  return (
    <group {...handlers}>
      {children}
      <mesh ref={ringRef} position={ring.pos} rotation-x={-Math.PI / 2} material={ringMat} renderOrder={5}>
        <ringGeometry args={[ring.r, ring.r + 0.16, 64]} />
      </mesh>
    </group>
  );
}

/* ───────────── Scene content ───────────── */

function Microgrid({ hourRef, flowOn, selected, onSelect, labelEls, quality, commands, allowZoom, interactive, reducedMotion }: Omit<Props, "active">) {
  const high = quality === "high";
  const [hovered, setHovered] = useState<ComponentId | null>(null);
  const { camera, scene, size } = useThree();
  const proj = useMemo(() => new THREE.Vector3(), []);
  const controls = useRef<OrbitControlsImpl>(null);
  const fly = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const track = useRef(0);
  const battery = useRef({ soc: 0.5, charging: true });

  const windowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1c10", emissive: new THREE.Color("#ffb35c"), emissiveIntensity: 1, roughness: 0.4 }), []);
  const meterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b1a17", emissive: new THREE.Color("#8fe3a6"), emissiveIntensity: 1.2 }), []);
  const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2216", emissive: new THREE.Color("#ffcf8f"), emissiveIntensity: 0 }), []);
  useEffect(
    () => () => {
      windowMat.dispose();
      meterMat.dispose();
      lampMat.dispose();
    },
    [windowMat, meterMat, lampMat],
  );

  // Flow controllers
  const fPV = useRef<FlowControl>({ active: 0, speed: 1 });
  const fBat = useRef<FlowControl>({ active: 0, speed: 1 });
  const fTrunk = useRef<FlowControl>({ active: 1, speed: 1 });
  const fHomes = useRef<FlowControl>({ active: 1, speed: 1 });
  const fSchool = useRef<FlowControl>({ active: 0, speed: 1 });
  const fMill = useRef<FlowControl>({ active: 0, speed: 1 });
  const fShops = useRef<FlowControl>({ active: 0, speed: 1 });
  const fPump = useRef<FlowControl>({ active: 0, speed: 1 });

  /* Network geometry */
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
      P8: V(1.2, 0, 1.8),
    };
    const top = (k: string) => V(poles[k].x, H - 0.25, poles[k].z);
    const chain = (pts: THREE.Vector3[], sag = 0.35) => pts.slice(0, -1).flatMap((p, i) => catenary(p, pts[i + 1], sag, 12).slice(i === 0 ? 0 : 1));
    const spans = (pts: THREE.Vector3[]) => pts.slice(0, -1).map((p, i) => catenary(p, pts[i + 1], 0.35, 12));
    const hubOut = V(-1.6, 2.2, -7.6);

    const trunk = [hubOut, top("P0"), top("P1"), top("P2"), top("P3")];
    const school = [top("P2"), top("P4"), V(11.5, 3.6, -10.6)];
    const homes = [top("P1"), V(4.2, 2.5, 0.6)];
    const homes2 = [top("P2"), V(8.6, 2.5, 0.8)];
    const homes3 = [top("P3"), V(13.4, 2.5, 0.4)];
    const mill = [top("P1"), top("P5"), top("P6"), V(11.2, 3.2, 6.6)];
    const shops = [top("P3"), top("P7"), V(18.2, 2.6, 1.6)];
    const pump = [top("P0"), top("P8"), V(-1.6, 1.6, 5.6)];
    const homesN = [top("P0"), V(3.6, 2.5, -7.2)];
    return {
      poles,
      spanSets: [trunk, school, homes, homes2, homes3, mill, shops, pump, homesN].flatMap(spans),
      paths: {
        pv: [V(-8.4, 1.1, -3), V(-6.2, 0.4, -5.2), V(-5, 0.4, -8.5), V(-4.4, 1.2, -8.5)],
        bat: [V(-3, 0.4, -7.1), V(-3, 0.3, -5.6), V(-2.6, 0.8, -4.7)],
        trunk: chain(trunk),
        homes: chain(homes, 0.25),
        homes2: chain(homes2, 0.25),
        homes3: chain(homes3, 0.25),
        homesN: chain(homesN, 0.25),
        school: chain(school),
        mill: chain(mill),
        shops: chain(shops),
        pump: chain(pump),
      },
    };
  }, []);

  /* Scatter */
  const scatter = useMemo(() => {
    const r = rng(11);
    const trees: Placement[] = [];
    const occupied = (x: number, z: number) =>
      (x > -21 && x < -7 && z > -10 && z < 4.5) ||
      (x > -6.5 && x < 1 && z > -11 && z < -1) ||
      (x > 4 && x < 19 && z > -16 && z < -8.6) ||
      (x > 1 && x < 22 && z > -6 && z < 3.5) ||
      (x > -17 && x < 1 && z > 4.5 && z < 12) ||
      (x > 8 && x < 17 && z > 4 && z < 10.5) ||
      (x > 1.5 && x < 7 && z > 4 && z < 9) ||
      Math.abs(z + 3.2) < 1.4;
    let g = 0;
    while (trees.length < (high ? 70 : 40) && g++ < 3000) {
      const x = (r() - 0.5) * 46;
      const z = -1.5 + (r() - 0.5) * 29;
      if (occupied(x, z)) continue;
      trees.push({ x, y: 0, z, s: 0.55 + r() * 0.6, r: r() * 6 });
    }
    const rocks: Placement[] = [];
    [
      [-20, 11],
      [20, -14],
      [-21.5, -14],
    ].forEach(([cx, cz]) => {
      for (let i = 0; i < 6; i++) {
        const s = 0.5 + r() * 1.4;
        rocks.push({ x: cx + (r() - 0.5) * 4, y: 0.6 + s * 0.4, z: cz + (r() - 0.5) * 3, s, r: r() * 6 });
      }
    });
    return { trees, rocks };
  }, [high]);

  /* Commands */
  useEffect(() => {
    commands.current = {
      zoom: (factor: number) => {
        const c = controls.current;
        if (!c) return;
        const dir = camera.position.clone().sub(c.target);
        const len = THREE.MathUtils.clamp(dir.length() * factor, 10, 80);
        fly.current = { pos: c.target.clone().add(dir.setLength(len)), target: c.target.clone() };
      },
      reset: () => {
        fly.current = { pos: HOME_CAM.clone(), target: HOME_TARGET.clone() };
      },
    };
  }, [camera, commands]);

  /* Fly to selection */
  useEffect(() => {
    const c = controls.current;
    if (!selected || !c) return;
    const f = FOCUS[selected];
    const target = V(...f.target);
    const dir = camera.position.clone().sub(c.target).normalize();
    if (dir.y < 0.45) dir.y = 0.45;
    dir.normalize();
    fly.current = { pos: target.clone().add(dir.multiplyScalar(f.dist)), target };
  }, [selected, camera]);

  const sunCol = useMemo(() => new THREE.Color(), []);
  const warm = useMemo(() => new THREE.Color("#ff9a4a"), []);
  const white = useMemo(() => new THREE.Color("#fff3dc"), []);

  useFrame((_, dt) => {
    const hour = hourRef.current ?? 12;
    const s = sampleAt(hour);
    const d = daylight(hour);

    // Sun path: east (+x) to west (−x), slight northern tilt (southern hemisphere)
    const theta = (Math.PI * (hour - 6)) / 12;
    const elev = Math.sin(theta);
    if (sun.current) {
      sun.current.position.set(Math.cos(theta) * 50, Math.max(2, elev * 45), -18);
      sunCol.copy(warm).lerp(white, smooth(0.05, 0.5, elev));
      sun.current.color.copy(sunCol);
      sun.current.intensity = 2.6 * d;
    }
    if (moon.current) moon.current.intensity = 0.55 * (1 - d);
    if (hemi.current) hemi.current.intensity = 0.25 + 1.05 * d;
    scene.environmentIntensity = 0.12 + 0.6 * d;

    // Tracker follows the sun; stows flat at night
    const want = d > 0.05 ? THREE.MathUtils.clamp(Math.PI / 2 - theta, -0.9, 0.9) : 0;
    track.current += (want - track.current) * Math.min(1, dt * 3);

    battery.current.soc = s.soc;
    battery.current.charging = s.batteryKw >= 0;

    windowMat.emissiveIntensity = 0.12 + 2.3 * (1 - d);
    lampMat.emissiveIntensity = 3 * (1 - d);
    meterMat.emissiveIntensity = selected === "meters" ? 3.5 : 1.1;

    // Flows
    const on = flowOn ? 1 : 0;
    const speed = reducedMotion ? 0.25 : 1;
    fPV.current.active = on * smooth(0.3, 3, s.pvKw);
    fPV.current.speed = speed;
    fBat.current.active = on * smooth(0.2, 1.5, Math.abs(s.batteryKw));
    fBat.current.speed = (s.batteryKw >= 0 ? 1 : -1) * speed;
    fTrunk.current.active = on;
    fTrunk.current.speed = speed * (0.6 + s.demandKw / 14);
    fHomes.current.active = on * (0.4 + 0.6 * (1 - d));
    fHomes.current.speed = speed;
    fSchool.current.active = on * (hour > 7.5 && hour < 15.5 ? 1 : 0);
    fSchool.current.speed = speed;
    fMill.current.active = on * (hour > 8.5 && hour < 16.5 ? 1 : 0);
    fMill.current.speed = speed;
    fShops.current.active = on * (hour > 7 && hour < 20.5 ? 1 : 0);
    fShops.current.speed = speed;
    fPump.current.active = on * (hour > 9.5 && hour < 15 ? 1 : 0);
    fPump.current.speed = speed;

    // Project label pins to screen space
    const els = labelEls.current;
    if (els) {
      for (const c of gridComponents) {
        const el = els[c.id];
        if (!el) continue;
        proj.set(...FOCUS[c.id].pin).project(camera);
        const x = (proj.x * 0.5 + 0.5) * size.width;
        const y = (-proj.y * 0.5 + 0.5) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        el.style.visibility = proj.z < 1 ? "visible" : "hidden";
      }
    }

    // Camera flight
    const c = controls.current;
    if (fly.current && c) {
      const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
      camera.position.lerp(fly.current.pos, k);
      c.target.lerp(fly.current.target, k);
      c.update();
      if (camera.position.distanceTo(fly.current.pos) < 0.05 && c.target.distanceTo(fly.current.target) < 0.05) fly.current = null;
    }
  });

  const selProps = { selected, onSelect, hovered, setHovered, interactive };
  const FLOW_DC = "#e8902a";
  const FLOW_AC = "#2f9a63";

  return (
    <>
      <hemisphereLight ref={hemi} color="#f4f1ea" groundColor="#a8977b" intensity={0.9} />
      <directionalLight
        ref={sun}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0005}
      />
      <directionalLight ref={moon} color="#6f86c4" position={[-30, 40, 20]} intensity={0} />
      <Environment resolution={32} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff5e4" position={[0, 20, -30]} scale={[80, 20, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 40, 20]} rotation-x={Math.PI / 2} scale={[60, 60, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#f3efe5" position={[0, 15, 60]} scale={[90, 30, 1]} />
      </Environment>

      <OrbitControls
        ref={controls}
        makeDefault
        enabled={interactive}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom={allowZoom}
        minDistance={10}
        maxDistance={80}
        minPolarAngle={0.3}
        maxPolarAngle={1.22}
        target={[HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z]}
        onStart={() => {
          fly.current = null;
        }}
      />

      <Plinth />

      <Selectable id="solar" ring={{ pos: [-14.5, 0.08, -3], r: 8.4 }} {...selProps}>
        <SolarArray rows={5} cols={10} position={[-14.5, 0, -3]} rotationY={Math.PI / 2} rowGap={2.5} panelW={1.1} panelD={1.8} trackRef={track} castShadow={high} />
      </Selectable>

      <Selectable id="inverter" ring={{ pos: [-3, 0.08, -8.5], r: 3.1 }} {...selProps}>
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
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} position={[-1.2 + i * 0.25, 1.6, 1.405]} material={stdMat("#6f6a60")}>
              <boxGeometry args={[0.12, 1.1, 0.02]} />
            </mesh>
          ))}
          <mesh position={[1, 1.2, 1.405]} material={stdMat("#3d3a35")}>
            <planeGeometry args={[0.9, 1.9]} />
          </mesh>
          {/* inverter cabinets outside */}
          {[0, 1].map((i) => (
            <mesh key={i} position={[2.5, 0.85, -0.6 + i * 1.1]} castShadow={high} material={stdMat("#8f948f", { metalness: 0.4, roughness: 0.4 })}>
              <boxGeometry args={[0.6, 1.4, 0.9]} />
            </mesh>
          ))}
        </group>
      </Selectable>

      <Selectable id="battery" ring={{ pos: [-2.5, 0.08, -3.4], r: 3.6 }} {...selProps}>
        <BatteryContainer position={[-2.5, 0, -3.4]} length={5} statusRef={battery} castShadow={high} />
      </Selectable>

      <Selectable id="meters" ring={{ pos: [-6, 0.08, -11.2], r: 1.3 }} {...selProps}>
        {/* communications mast */}
        <group position={[-6, 0, -11.2]}>
          <mesh position={[0, 3.2, 0]} castShadow={high} material={stdMat(tones.frame, { metalness: 0.7, roughness: 0.35 })}>
            <cylinderGeometry args={[0.06, 0.12, 6.4, 6]} />
          </mesh>
          <mesh position={[0.25, 5.6, 0]} material={stdMat("#d9d6ce")}>
            <boxGeometry args={[0.1, 0.8, 0.3]} />
          </mesh>
          <mesh position={[0, 6.45, 0]} material={meterMat}>
            <sphereGeometry args={[0.09, 8, 6]} />
          </mesh>
        </group>
      </Selectable>

      <Selectable id="distribution" ring={{ pos: [8.5, 0.08, -4.6], r: 1.4 }} {...selProps}>
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
        {/* invisible hit volume along trunk for easier picking */}
        <mesh position={[8.6, 4.6, -4.6]} visible={false}>
          <boxGeometry args={[15, 1.2, 1.2]} />
        </mesh>
      </Selectable>

      <Selectable id="household" ring={{ pos: [4.2, 0.08, -0.6], r: 2.6 }} {...selProps}>
        <House position={[4.2, 0, -0.6]} w={3.2} d={2.6} wall={tones.wallPlaster} roof={tones.roofIron} windowMat={windowMat} castShadow={high}>
          <mesh position={[1.62, 1.2, 0.6]} material={meterMat}>
            <boxGeometry args={[0.06, 0.3, 0.22]} />
          </mesh>
        </House>
      </Selectable>

      {/* Other homes (part of the network, highlighted with meters) */}
      {(
        [
          [8.6, -0.2, tones.wallBrick, tones.roofRust, "gable"],
          [13.4, -0.8, tones.wallLime, tones.roofDark, "mono"],
          [3.6, -7.3, "#b89272", tones.roofIron, "gable"],
          [4.4, 6.6, tones.wallLime, tones.roofIron, "mono"],
          [16.6, -7.6, tones.wallPlaster, tones.roofRust, "gable"],
        ] as const
      ).map(([x, z, wall, roof, type], i) => (
        <House key={i} position={[x, 0, z]} rotationY={i % 2 ? 0.08 : -0.06} w={3} d={2.5} wall={wall} roof={roof} roofType={type} windowMat={windowMat} castShadow={high}>
          <mesh position={[1.52, 1.2, 0.5]} material={meterMat}>
            <boxGeometry args={[0.06, 0.3, 0.22]} />
          </mesh>
        </House>
      ))}

      <Selectable id="school" ring={{ pos: [11.5, 0.08, -12.5], r: 6.6 }} {...selProps}>
        <School position={[11.5, 0, -12.5]} windowMat={windowMat} castShadow={high} />
      </Selectable>

      <Selectable id="productive" ring={{ pos: [12.5, 0.08, 7.4], r: 4.2 }} {...selProps}>
        <group position={[12.5, 0, 7.4]}>
          <mesh position={[0, 0.08, 0]} receiveShadow material={stdMat(tones.concrete)}>
            <boxGeometry args={[7.4, 0.16, 4.6]} />
          </mesh>
          {/* mill shed */}
          <mesh position={[-1.4, 1.5, 0]} castShadow={high} receiveShadow material={stdMat("#b5a588")}>
            <boxGeometry args={[3.6, 2.8, 3.4]} />
          </mesh>
          <mesh position={[-1.4, 2.9, 0]} rotation-z={0.12} castShadow={high} material={stdMat(tones.roofIron, { metalness: 0.5, roughness: 0.45 })}>
            <boxGeometry args={[4.2, 0.08, 3.9]} />
          </mesh>
          {/* hopper */}
          <mesh position={[-1.4, 3.5, 0.6]} rotation-x={Math.PI} material={stdMat("#8c8f8c", { metalness: 0.6 })}>
            <coneGeometry args={[0.45, 0.8, 4]} />
          </mesh>
          {/* cold room */}
          <mesh position={[2.1, 1.25, 0]} castShadow={high} receiveShadow material={stdMat("#e4e2dc", { roughness: 0.4 })}>
            <boxGeometry args={[2.6, 2.3, 2.8]} />
          </mesh>
          <mesh position={[2.1, 1.9, 1.405]} material={stdMat("#1b2430", { emissive: "#5a8ee0", emissiveIntensity: 0.6 })}>
            <planeGeometry args={[1.2, 0.08]} />
          </mesh>
          <mesh position={[3.5, 1.6, 0]} material={stdMat("#b9b5ab")}>
            <boxGeometry args={[0.2, 0.8, 1.0]} />
          </mesh>
        </group>
      </Selectable>

      <Selectable id="water" ring={{ pos: [-3, 0.08, 7], r: 3.2 }} {...selProps}>
        <group position={[-1.6, 0, 6.2]}>
          {/* tank stand */}
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
          <mesh position={[0, 5.6, 0]} castShadow={high} material={stdMat("#2f3a3c", { roughness: 0.6 })}>
            <cylinderGeometry args={[1.25, 1.25, 1.9, 20]} />
          </mesh>
          {/* pump house */}
          <mesh position={[-2.6, 0.55, 0.8]} castShadow={high} material={stdMat("#7a7f82", { metalness: 0.4 })}>
            <boxGeometry args={[1.1, 1.0, 1.0]} />
          </mesh>
        </group>
        {/* irrigated field */}
        <group position={[-10.5, 0.06, 8.4]}>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-5 + i * 1.25, 0.1, 0]} receiveShadow material={stdMat(i % 2 ? "#5f7a35" : "#6f8a3c")}>
              <boxGeometry args={[0.7, 0.22, 5.6]} />
            </mesh>
          ))}
        </group>
      </Selectable>

      <Selectable id="business" ring={{ pos: [18.6, 0.08, 1.6], r: 3.4 }} {...selProps}>
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
          <mesh position={[0, 0.08, 0.6]} receiveShadow material={stdMat(tones.concrete)}>
            <boxGeometry args={[7, 0.16, 4]} />
          </mesh>
        </group>
      </Selectable>

      <Trees items={scatter.trees} castShadow={high} />
      <Rocks items={scatter.rocks} castShadow={high} />

      {/* Energy flows */}
      <EnergyFlow points={net.paths.pv} color={FLOW_DC} count={10} size={0.12} control={fPV} />
      <EnergyFlow points={net.paths.bat} color={FLOW_DC} count={6} size={0.12} control={fBat} />
      <EnergyFlow points={net.paths.trunk} color={FLOW_AC} count={22} size={0.11} control={fTrunk} />
      <EnergyFlow points={net.paths.homes} color={FLOW_AC} count={4} size={0.09} control={fHomes} />
      <EnergyFlow points={net.paths.homes2} color={FLOW_AC} count={4} size={0.09} control={fHomes} />
      <EnergyFlow points={net.paths.homes3} color={FLOW_AC} count={4} size={0.09} control={fHomes} />
      <EnergyFlow points={net.paths.homesN} color={FLOW_AC} count={4} size={0.09} control={fHomes} />
      <EnergyFlow points={net.paths.school} color={FLOW_AC} count={7} size={0.1} control={fSchool} />
      <EnergyFlow points={net.paths.mill} color={FLOW_AC} count={9} size={0.1} control={fMill} />
      <EnergyFlow points={net.paths.shops} color={FLOW_AC} count={6} size={0.1} control={fShops} />
      <EnergyFlow points={net.paths.pump} color={FLOW_AC} count={7} size={0.1} control={fPump} />

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

export default function MicrogridScene(props: Props) {
  const { quality, active } = props;
  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);
  return (
    <Canvas
      shadows={quality === "high" ? "percentage" : false}
      dpr={quality === "high" ? [1, 1.75] : [1, 1.3]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 34, near: 0.5, far: 400, position: [HOME_CAM.x, HOME_CAM.y, HOME_CAM.z] }}
      onPointerMissed={() => props.onSelect(null)}
      aria-hidden
      tabIndex={-1}
    >
      <FrameGate active={active} />
      <Microgrid {...props} />
    </Canvas>
  );
}

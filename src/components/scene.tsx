"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";

/* The reference portrait is a circular crop inside a larger poster, so it is
   cut out by fraction of the natural image size. Any other portrait is simply
   centre-cropped. */
const REFERENCE = "/emon-reference.jpeg";
const REFERENCE_CROP = { x: 0.316, y: 0.0375, w: 0.256, h: 0.1437 };
const GRID = 240;

type Cloud = { pos: Float32Array; seed: Float32Array; tone: Float32Array };

const pointer = { x: 0, y: 0, inside: false };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function cornerAverage(data: Uint8ClampedArray) {
  const sum = [0, 0, 0];
  let n = 0;
  for (const [cx, cy] of [
    [0, 0],
    [GRID - 8, 0],
    [0, GRID - 8],
    [GRID - 8, GRID - 8],
  ])
    for (let y = cy; y < cy + 8; y++)
      for (let x = cx; x < cx + 8; x++) {
        const i = (y * GRID + x) * 4;
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
        n++;
      }
  return sum.map((v) => v / n);
}

/* Backdrop colour of the reference crop: patches beside the shoulders, away
   from the head and clear of the circular border. */
function edgeAverage(data: Uint8ClampedArray) {
  const sum = [0, 0, 0];
  let n = 0;
  for (const x0 of [0.08, 0.84])
    for (let y = Math.round(GRID * 0.1); y < Math.round(GRID * 0.3); y++)
      for (let x = Math.round(GRID * x0); x < Math.round(GRID * (x0 + 0.08)); x++) {
        const i = (y * GRID + x) * 4;
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
        n++;
      }
  return sum.map((v) => v / n);
}

function toCloud(img: HTMLImageElement, reference: boolean, intensity: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRID;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (reference) {
    const c = REFERENCE_CROP;
    ctx.drawImage(img, c.x * w, c.y * h, c.w * w, c.h * h, 0, 0, GRID, GRID);
  } else {
    const side = Math.min(w, h);
    ctx.drawImage(img, (w - side) / 2, 0, side, side, 0, 0, GRID, GRID);
  }
  const data = ctx.getImageData(0, 0, GRID, GRID).data;
  const bg = reference ? edgeAverage(data) : cornerAverage(data);
  const pos: number[] = [];
  const tone: number[] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      const i = (y * GRID + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const radius = Math.hypot(x / GRID - 0.5, y / GRID - 0.5);
      const mask = 1 - smooth(0.36, 0.49, radius);
      const away =
        Math.hypot(r - bg[0], g - bg[1], b - bg[2]) / Math.hypot(255, 255, 255);
      /* In the reference photo the skin is close to the studio backdrop, so a
         head-shaped prior keeps the face from dissolving into it. */
      const head = reference
        ? 1 - smooth(0.7, 1, Math.hypot((x / GRID - 0.5) / 0.2, (y / GRID - 0.25) / 0.27))
        : 0;
      const subject = Math.max(smooth(0.05, 0.2, away), head);
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const density =
        mask * subject * (0.28 + 0.72 * Math.pow(lum, 0.75)) * (0.6 + intensity);
      const count = Math.floor(density * 1.7 + Math.random());
      for (let k = 0; k < count; k++) {
        pos.push(
          (x + Math.random()) / GRID - 0.5,
          0.5 - (y + Math.random()) / GRID,
          0,
        );
        tone.push(lum);
      }
    }
  const n = pos.length / 3;
  if (!n) return null;
  return {
    pos: new Float32Array(pos),
    tone: new Float32Array(tone),
    seed: Float32Array.from({ length: n }, Math.random),
  } satisfies Cloud;
}

function useCloud(src: string, intensity: number) {
  const [cloud, setCloud] = useState<Cloud | null>(null);
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const next = toCloud(img, src === REFERENCE, intensity);
        if (!cancelled) setCloud(next);
      } catch {
        // a cross-origin image without CORS headers cannot be read; skip it
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, intensity]);
  return cloud;
}

const vertex = /* glsl */ `
uniform float uTime;
uniform float uDisperse;
uniform vec2 uMouse;
uniform float uWorld;
uniform float uHeight;
uniform float uFade;
attribute float aSeed;
attribute float aTone;
varying float vTone;
varying float vAlpha;
void main() {
  vec3 p = position;
  float t = uTime * 0.4 + aSeed * 6.2831;
  p.z += (aSeed - 0.5) * 0.06 + sin(t) * 0.008;
  p.xy += vec2(cos(t * 1.3), sin(t * 0.9)) * 0.0025;

  vec2 away = p.xy - uMouse;
  float d = length(away);
  float push = smoothstep(0.14, 0.0, d);
  p.xy += normalize(away + 1e-4) * push * (0.05 + aSeed * 0.05);
  p.z += push * 0.12 * (0.4 + aSeed);

  vec3 drift = vec3(cos(aSeed * 40.0), sin(aSeed * 53.0), (aSeed - 0.5) * 2.0);
  p += drift * uDisperse * (0.25 + aSeed * 1.1);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, uWorld * (0.7 + aTone * 0.7) * projectionMatrix[1][1] * uHeight * 0.5 / -mv.z);
  vTone = aTone;
  vAlpha = (0.3 + 0.7 * aTone) * (1.0 - uDisperse) * uFade;
}
`;

const fragment = /* glsl */ `
varying float vTone;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.15, d) * vAlpha;
  gl_FragColor = vec4(vec3(0.62 + 0.38 * vTone), a);
}
`;

function Portrait({ cloud, animate }: { cloud: Cloud; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(cloud.pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(cloud.seed, 1));
    g.setAttribute("aTone", new THREE.BufferAttribute(cloud.tone, 1));
    return g;
  }, [cloud]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uDisperse: { value: 0 },
          uMouse: { value: new THREE.Vector2(9, 9) },
          uWorld: { value: 0.01 },
          uHeight: { value: 800 },
          uFade: { value: 1 },
        },
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const mouse = useRef(new THREE.Vector2(9, 9));
  const goal = useRef(new THREE.Vector2(9, 9));
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const { viewport, size, gl } = state;
    const desktop = size.width >= 900;
    const scale = desktop
      ? Math.min(viewport.height * 1.02, viewport.width * 0.6)
      : Math.min(viewport.width * 1.05, viewport.height * 0.62);
    const p = Math.min(
      1,
      Math.max(0, window.scrollY / (window.innerHeight * 0.9)),
    );
    const x = desktop ? viewport.width * 0.09 : 0;
    const y =
      (desktop ? 0 : -viewport.height * 0.1) + p * viewport.height * 0.3;
    g.position.set(x, y, 0);
    g.scale.setScalar(scale);
    g.visible = p < 0.995;

    if (animate && pointer.inside)
      goal.current.set(
        (pointer.x * (viewport.width / 2) - x) / scale,
        (pointer.y * (viewport.height / 2) - y) / scale,
      );
    else goal.current.set(9, 9);
    mouse.current.lerp(goal.current, pointer.inside ? 0.18 : 0.06);
    g.rotation.y = (animate ? pointer.x * 0.16 : 0) + p * 0.5;
    g.rotation.x = animate ? -pointer.y * 0.06 : 0;

    const u = material.uniforms;
    u.uTime.value = animate ? state.clock.elapsedTime : 0;
    u.uDisperse.value = p * p;
    u.uMouse.value.copy(mouse.current);
    u.uWorld.value = scale * 0.0046;
    u.uHeight.value = size.height * gl.getPixelRatio();
    u.uFade.value = desktop ? 1 : 0.42;
  });
  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

function Stars({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const count = 520;
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 20;
      a[i * 3 + 1] = (Math.random() - 0.5) * 12;
      a[i * 3 + 2] = -4 + Math.random() * 6;
    }
    return a;
  }, []);
  useFrame((state) => {
    const s = ref.current;
    if (!s) return;
    const t = animate ? state.clock.elapsedTime : 0;
    s.rotation.y = t * 0.012 + (animate ? pointer.x * 0.04 : 0);
    s.position.y = window.scrollY * 0.0016;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={1.4}
        sizeAttenuation={false}
        color="#ffffff"
        transparent
        opacity={0.38}
        depthWrite={false}
      />
    </points>
  );
}

function Rig({ animate }: { animate: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.inside = true;
    };
    const leave = () => {
      pointer.inside = false;
    };
    const redraw = () => invalidate();
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", redraw, { passive: true });
    window.addEventListener("resize", redraw);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", redraw);
      window.removeEventListener("resize", redraw);
    };
  }, [invalidate]);
  useFrame((state) => {
    if (!animate) return;
    const cam = state.camera;
    cam.position.x += (pointer.x * 0.12 - cam.position.x) * 0.04;
    cam.position.y += (pointer.y * 0.08 - cam.position.y) * 0.04;
    cam.lookAt(0, 0, 0);
  });
  return null;
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Scene({
  enabled,
  intensity,
  portrait,
}: {
  enabled: boolean;
  intensity: number;
  portrait: string;
}) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const animate = enabled && !reduced;
  const cloud = useCloud(portrait, intensity);
  return (
    <div className="px-scene" aria-hidden="true">
      <Boundary>
        <Canvas
          dpr={[1, 1.75]}
          frameloop={animate ? "always" : "demand"}
          camera={{ position: [0, 0, 5], fov: 40 }}
          gl={{
            alpha: true,
            antialias: false,
            powerPreference: "high-performance",
          }}
        >
          <Rig animate={animate} />
          <Stars animate={animate} />
          {cloud && <Portrait cloud={cloud} animate={animate} />}
        </Canvas>
      </Boundary>
    </div>
  );
}

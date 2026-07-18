import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import * as THREE from "three";
import type { ThemeBackgroundScene, ThemeVisualTuning } from "../theme";

type Props = {
  imageUrl?: string;
  videoUrl?: string;
  scene?: ThemeBackgroundScene;
  tuning: ThemeVisualTuning;
};

export function ThemeBackgroundMedia({ imageUrl, videoUrl, scene, tuning }: Props) {
  return (
    <Box data-testid="theme-background-media" sx={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {imageUrl && (
        <Box
          data-testid="theme-background-image"
          sx={{
            position: "absolute",
            inset: 0,
            opacity: tuning.backgroundLayerOpacity,
            backgroundImage: `url("${imageUrl}")`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
      )}
      {videoUrl && (
        <Box
          component="video"
          data-testid="theme-background-video"
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: tuning.backgroundLayerOpacity
          }}
        />
      )}
      {scene?.renderer === "canvas" && <CanvasBackgroundScene scene={scene} />}
      {scene?.renderer === "three" && <ThreeBackgroundScene scene={scene} />}
    </Box>
  );
}

function CanvasBackgroundScene({ scene }: { scene: ThemeBackgroundScene }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    let animationId = 0;
    let width = 1;
    let height = 1;
    const speed = clampNumber(scene.speed, 0.6, 0.1, 3);
    const density = clampNumber(scene.density, 0.55, 0.1, 1);
    const primary = scene.color ?? "#D94F75";
    const secondary = scene.secondaryColor ?? "#F8B4C4";

    const resize = () => {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(width * Math.min(window.devicePixelRatio, 2));
      canvas.height = Math.round(height * Math.min(window.devicePixelRatio, 2));
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const animate = (time: number) => {
      const t = time * 0.00018 * speed;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = clampNumber(scene.opacity, 0.54, 0, 1);
      if (scene.preset === "particles") {
        drawParticles(context, width, height, t, density, primary, secondary);
      } else {
        drawAurora(context, width, height, t, primary, secondary);
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [scene]);

  return <Box component="canvas" ref={canvasRef} data-testid="theme-background-canvas" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

function ThreeBackgroundScene({ scene }: { scene: ThemeBackgroundScene }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.append(renderer.domElement);

    const threeScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.2);
    const primary = new THREE.Color(scene.color ?? "#D94F75");
    const secondary = new THREE.Color(scene.secondaryColor ?? "#F8B4C4");
    const density = clampNumber(scene.density, 0.58, 0.1, 1);
    const speed = clampNumber(scene.speed, 0.65, 0.1, 3);
    const group = new THREE.Group();
    threeScene.add(group);
    threeScene.add(new THREE.AmbientLight("#ffffff", 1.4));
    const light = new THREE.PointLight(primary, 2.8, 10);
    light.position.set(2.5, 1.8, 3.5);
    threeScene.add(light);

    const count = Math.round(18 + density * 46);
    const geometry = scene.preset === "orbit" ? new THREE.IcosahedronGeometry(0.08, 1) : new THREE.SphereGeometry(0.055, 14, 14);
    const material = new THREE.MeshStandardMaterial({
      color: primary,
      emissive: secondary,
      emissiveIntensity: 0.22,
      roughness: 0.38,
      metalness: 0.14,
      transparent: true,
      opacity: clampNumber(scene.opacity, 0.62, 0, 1)
    });
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(geometry, material);
      const angle = (index / count) * Math.PI * 2;
      const radius = 1.2 + (index % 7) * 0.28;
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 0.9, Math.sin(angle) * radius * 0.36);
      mesh.scale.setScalar(1 + (index % 5) * 0.36);
      group.add(mesh);
    }

    let animationId = 0;
    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const animate = (time: number) => {
      const t = time * 0.00016 * speed;
      group.rotation.y = t;
      group.rotation.x = Math.sin(t * 0.7) * 0.18;
      renderer.render(threeScene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [scene]);

  return <Box ref={mountRef} data-testid="theme-background-three" sx={{ position: "absolute", inset: 0, opacity: clampNumber(scene.opacity, 0.62, 0, 1) }} />;
}

function drawAurora(context: CanvasRenderingContext2D, width: number, height: number, time: number, primary: string, secondary: string) {
  for (let band = 0; band < 4; band += 1) {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, band % 2 === 0 ? primary : secondary);
    gradient.addColorStop(1, band % 2 === 0 ? secondary : primary);
    context.strokeStyle = gradient;
    context.lineWidth = 72 - band * 9;
    context.beginPath();
    for (let x = -80; x <= width + 80; x += 28) {
      const y = height * (0.24 + band * 0.13) + Math.sin(x * 0.007 + time + band) * 48 + Math.cos(x * 0.012 - time * 0.8) * 18;
      if (x === -80) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }
}

function drawParticles(context: CanvasRenderingContext2D, width: number, height: number, time: number, density: number, primary: string, secondary: string) {
  const count = Math.round(24 + density * 90);
  for (let index = 0; index < count; index += 1) {
    const angle = index * 12.9898;
    const x = ((Math.sin(angle) * 43758.5453 + time * 48) % 1) * width;
    const y = ((Math.cos(angle * 0.73) * 24634.6345 + time * 26) % 1) * height;
    const size = 1.5 + (index % 5) * 0.8;
    context.fillStyle = index % 2 === 0 ? primary : secondary;
    context.beginPath();
    context.arc((x + width) % width, (y + height) % height, size, 0, Math.PI * 2);
    context.fill();
  }
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numberValue));
}

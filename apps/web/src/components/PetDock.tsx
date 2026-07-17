import { useEffect, useRef } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import * as THREE from "three";

type Props = {
  enabled: boolean;
};

export function PetDock({ enabled }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || !mountRef.current) {
      return;
    }

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.35, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.append(renderer.domElement);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.05, 1.2),
      new THREE.MeshStandardMaterial({ color: "#61F3F3", roughness: 0.45, metalness: 0.18 })
    );
    body.rotation.set(0.2, -0.2, 0);
    scene.add(body);

    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.36, 0.05),
      new THREE.MeshStandardMaterial({ color: "#141A21", roughness: 0.35 })
    );
    face.position.set(0, 0.08, 0.63);
    scene.add(face);

    const glow = new THREE.PointLight("#61F3F3", 2.4, 6);
    glow.position.set(0.9, 1.2, 2.2);
    scene.add(glow);
    scene.add(new THREE.HemisphereLight("#ffffff", "#1877F2", 1.4));

    let frame = 0;
    let animationId = 0;
    const animate = () => {
      frame += 0.014;
      body.rotation.y = Math.sin(frame) * 0.38;
      body.rotation.x = 0.18 + Math.sin(frame * 0.7) * 0.08;
      face.rotation.copy(body.rotation);
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const width = Math.max(1, entry.contentRect.width);
      const height = Math.max(1, entry.contentRect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      mount.removeChild(renderer.domElement);
      body.geometry.dispose();
      face.geometry.dispose();
      (body.material as THREE.Material).dispose();
      (face.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [enabled]);

  return (
    <Box
      role="img"
      aria-label="Three.js pet dock preview"
      sx={{
        height: 156,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.default",
        position: "relative"
      }}
    >
      {enabled ? (
        <Box ref={mountRef} sx={{ position: "absolute", inset: 0 }} />
      ) : (
        <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }} spacing={1}>
          <Chip size="small" label="Disabled" />
          <Typography variant="caption" color="text.secondary">
            Enable the pet dock to mount a Three.js scene.
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

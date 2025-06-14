import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, Html } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import * as THREE from "three";
import gsap from "gsap";
import Workspace from "./Workspace";

export default function Experience() {
  const [showTitle, setShowTitle] = useState(true);
  const [titleText, setTitleText] = useState("CALCIFER");
  const [fadeOut, setFadeOut] = useState(false);
  const cameraRef = useRef();
  const stopEffectRef = useRef(false);
  const speedRef = useRef(15);
  const borderMaskRef = useRef(4.5);

  useEffect(() => {
    if (cameraRef.current) {
      setFadeOut(true);
      if (cameraRef.current) {
        gsap.to(cameraRef.current.position, {
          z: 0.4,
          x: cameraRef.current.position.x - 0.14,
          y: cameraRef.current.position.y - 0.27,
          duration: 3.6,
          delay: 0.5,
          ease: "power3.inOut",
          onUpdate: () => {
            speedRef.current = Math.max(0, speedRef.current - 0.3);
            borderMaskRef.current = Math.max(1.4, borderMaskRef.current - 0.07);
          },
          onComplete: () => {
            gsap.to(cameraRef.current.position, {
              z: 0.0,
              duration: 0.3,
              ease: "power3.inOut",
            });
            stopEffectRef.current = true;
            setInterval(() => {
              borderMaskRef.current = borderMaskRef.current + 0.5;
            }, [5]);

            setTimeout(() => setShowTitle(false), 500);
          },
        });
      }
    }

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const targetText = "CALCIFER";
    let iteration = 0;

    const interval = setInterval(() => {
      setTitleText((prev) =>
        prev
          .split("")
          .map((_, index) => {
            if (index < iteration) {
              return targetText[index];
            }
            return letters[Math.floor(Math.random() * 26)];
          })
          .join("")
      );

      iteration += 1 / 10;

      if (iteration >= targetText.length) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [cameraRef.current]);

  return (
    <>
      {showTitle && (
        <div className="bg-black w-full h-full">
          <div
            className={`absolute inset-0 z-50 flex items-center justify-center bg-black text-white text-center transition-opacity duration-[2000ms] ${
              fadeOut ? "opacity-0" : "opacity-100"
            }`}
          >
            <h1 className="text-5xl md:text-6xl font-bold hero-text-glitch">
              {titleText}
            </h1>
          </div>

          <Canvas
            style={{ width: "100vw", height: "100vh" }}
            dpr={Math.min(window.devicePixelRatio, 2)}
          >
            <Suspense fallback={<Html>Loading...</Html>}>
              <SceneContent
                cameraRef={cameraRef}
                stopEffectRef={stopEffectRef}
                speedRef={speedRef}
                borderMaskRef={borderMaskRef}
              />
            </Suspense>
          </Canvas>
        </div>
      )}

      {!showTitle && <Workspace />}
    </>
  );
}

function SceneContent({ cameraRef, stopEffectRef, speedRef, borderMaskRef }) {
  const { camera } = useThree();
  const meshRef = useRef();
  const startTime = useRef(Date.now());

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load("/textures/earth_lights_2048.png");
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      crtWidth: { value: 1608 },
      crtHeight: { value: 1608 },
      cellOffset: { value: 0.5 },
      cellSize: { value: 6 },
      borderMask: { value: borderMaskRef.current },
      pulseIntensity: { value: 0.06 },
      pulseWidth: { value: 60 },
      pulseRate: { value: 20 },
      speed: { value: speedRef.current },
      textureSampler: { value: texture },
    }),
    [texture]
  );

  useEffect(() => {
    camera.position.set(0, 0, 2);
    if (cameraRef) cameraRef.current = camera;
  }, [camera, cameraRef]);

  useFrame(() => {
    if (!stopEffectRef.current) {
      uniforms.time.value = (Date.now() - startTime.current) * 0.001;
      uniforms.speed.value = speedRef.current;
    }
    uniforms.borderMask.value = borderMaskRef.current;
  });

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float time;
    uniform float crtWidth;
    uniform float crtHeight;
    uniform float cellOffset;
    uniform float cellSize;
    uniform float borderMask;
    uniform float pulseIntensity;
    uniform float pulseWidth;
    uniform float pulseRate;
    uniform float speed;
    uniform sampler2D textureSampler;
    varying vec2 vUv;

    void main() {
      vec2 pixel = (vUv * 0.5 + 0.5) * vec2(crtWidth, crtHeight);
      vec2 coord = pixel / cellSize;
      vec2 subcoord = coord * vec2(3.0, 1.0);
      vec2 offset = vec2(0.0, fract(floor(coord.x) * cellOffset));
      vec2 maskCoord = floor(coord + offset) * cellSize;
      vec2 samplePoint = maskCoord / vec2(crtWidth, crtHeight);
      samplePoint.x += fract(time * speed / 20.0);

      vec3 color = texture2D(textureSampler, samplePoint).rgb;
      float ind = mod(floor(subcoord.x), 3.0);

      vec3 maskColor = vec3(
        float(ind == 0.0),
        float(ind == 1.0),
        float(ind == 2.0)
      ) * 3.0;

      vec2 cellUV = fract(subcoord + offset) * 2.0 - 1.0;
      vec2 border = 1.0 - cellUV * cellUV * borderMask;

      maskColor *= clamp(border.x, 0.0, 1.0) * clamp(border.y, 0.0, 1.0);
      color *= maskColor;

      float pulse = sin(pixel.y / pulseWidth + time * pulseRate);
      color *= 1.0 + pulseIntensity * pulse;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 2]} />

      <mesh ref={meshRef}>
        <planeGeometry args={[2, 1]} />
        <shaderMaterial
          attach="material"
          args={[
            {
              vertexShader,
              fragmentShader,
              uniforms,
              side: THREE.DoubleSide,
              transparent: false,
            },
          ]}
        />
      </mesh>
    </>
  );
}

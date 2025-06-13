import { Canvas } from "@react-three/fiber";
import { useGLTF, PerspectiveCamera } from "@react-three/drei";
import { useState, useEffect } from "react";

export default function Experience() {
  const { scene } = useGLTF("/model.glb");
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowTitle(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showTitle && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black text-white text-center">
          <h1
            className="text-5xl md:text-6xl font-bold hyperplexed-glitch"
            data-text="Calcifer"
          >
            Calcifer
          </h1>
        </div>
      )}

      <Canvas style={{ width: "100vw", height: "100vh" }}>
        <PerspectiveCamera makeDefault position={[0, 1, 5]} />
        <ambientLight intensity={0.75} />
        <primitive object={scene} />
      </Canvas>
    </>
  );
}

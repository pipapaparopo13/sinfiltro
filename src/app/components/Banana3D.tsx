"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three-stdlib";
import { MTLLoader } from "three-stdlib";

interface Banana3DProps {
    isSpeaking: boolean;
}

function BearModel({ isSpeaking }: { isSpeaking: boolean }) {
    const groupRef = useRef<THREE.Group>(null);

    // Cargar materiales y modelo
    const materials = useLoader(MTLLoader, '/models/bear.mtl');
    const obj = useLoader(OBJLoader, '/models/bear.obj', (loader) => {
        materials.preload();
        loader.setMaterials(materials);
    });

    // Animación continua
    useFrame((state) => {
        if (groupRef.current) {
            // Animación de flotación suave
            const floatSpeed = isSpeaking ? 3 : 1;
            const floatIntensity = isSpeaking ? 0.4 : 0.15;
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * floatSpeed) * floatIntensity;

            // Rotación suave
            const rotationSpeed = isSpeaking ? 1.5 : 0.4;
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * rotationSpeed) * 0.15;

            // Simular habla con escalado y cabeceo
            if (isSpeaking) {
                // Movimiento de cabeceo rápido
                groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.1;

                // Escalado rítmico en Y para simular apertura de boca/gesto de hablar
                const mouthSimulation = 1 + Math.abs(Math.sin(state.clock.elapsedTime * 12)) * 0.05;
                groupRef.current.scale.set(1, mouthSimulation, 1);
            } else {
                groupRef.current.rotation.x = 0;
                groupRef.current.scale.set(1, 1, 1);
            }
        }
    });

    return (
        <group ref={groupRef}>
            <primitive
                object={obj}
                scale={0.8}
                position={[0, -1, 0]}
                rotation={[0, 0, 0]}
            />
        </group>
    );
}

function Loader() {
    return (
        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="orange" />
        </mesh>
    );
}

export default function Banana3D({ isSpeaking }: Banana3DProps) {
    return (
        <div style={{ width: "400px", height: "400px", position: "relative" }}>
            <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                style={{ background: "transparent" }}
            >
                {/* Iluminación mejorada */}
                <ambientLight intensity={0.7} />
                <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
                <pointLight position={[-5, 3, -5]} intensity={0.6} color="#FFD700" />
                <spotLight
                    position={[0, 5, 3]}
                    angle={0.4}
                    intensity={0.9}
                    penumbra={1}
                    castShadow
                />

                {/* Modelo 3D del osito */}
                <Suspense fallback={<Loader />}>
                    <BearModel isSpeaking={isSpeaking} />
                </Suspense>

                {/* Entorno para reflejos realistas */}
                <Environment preset="city" />

                {/* Controles opcionales - descomenta para desarrollo */}
                {/* <OrbitControls enableZoom={true} /> */}
            </Canvas>
        </div>
    );
}

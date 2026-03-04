"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

export function ParticleSystem({ count = 2000 }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const { mouse, viewport } = useThree();
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Generate particles
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const time = Math.random() * 100;
            const factor = Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;
            const x = Math.random() * 80 - 40;
            const y = Math.random() * 80 - 40;
            const z = Math.random() * 80 - 40;

            temp.push({ time, factor, speed, x, y, z });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        // Make particles react subtly to mouse position
        const targetX = (mouse.x * viewport.width) / 2;
        const targetY = (mouse.y * viewport.height) / 2;

        particles.forEach((particle, i) => {
            let { time, factor, speed, x, y, z } = particle;

            time = particle.time += speed / 2;

            // Mouse attraction
            const dx = targetX - x;
            const dy = targetY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let mx = x;
            let my = y;
            let mz = z;

            // Apply subtle gravity toward mouse
            if (dist < 15) {
                mx += dx * 0.02;
                my += dy * 0.02;
            }

            dummy.position.set(
                mx + Math.cos((time / 10) * factor) + (Math.sin(time * 1) * factor) / 10,
                my + Math.sin((time / 10) * factor) + (Math.cos(time * 2) * factor) / 10,
                mz + Math.cos((time / 10) * factor) + (Math.sin(time * 3) * factor) / 10
            );

            const s = Math.min(Math.max(Math.cos(time) * 0.2, 0.05), 0.3);
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();

            if (mesh.current) {
                mesh.current.setMatrixAt(i, dummy.matrix);
            }
        });

        if (mesh.current) {
            mesh.current.instanceMatrix.needsUpdate = true;
            mesh.current.rotation.y -= 0.001;
            mesh.current.rotation.x += 0.0005;
        }
    });

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
            <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
                <icosahedronGeometry args={[0.2, 0]} />
                <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
            </instancedMesh>
        </>
    );
}

import { Float, PresentationControls, MeshDistortMaterial } from '@react-three/drei';

export function InteractiveAuvraCoin() {
    return (
        <PresentationControls global rotation={[0, 0.3, 0]} polar={[-0.4, 0.2]} azimuth={[-1, 0.75]} snap={true}>
            <Float rotationIntensity={0.4} speed={2} floatIntensity={2}>
                <mesh scale={2.5}>
                    <torusKnotGeometry args={[1, 0.3, 128, 32]} />
                    <MeshDistortMaterial
                        color="#06b6d4"
                        envMapIntensity={1}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        metalness={0.9}
                        roughness={0.1}
                        distort={0.4}
                        speed={2}
                    />
                </mesh>
            </Float>
        </PresentationControls>
    );
}

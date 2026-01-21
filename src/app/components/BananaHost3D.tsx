"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface BananaHost3DProps {
    isSpeaking: boolean;
}

export default function BananaHost3D({ isSpeaking }: BananaHost3DProps) {
    return (
        <div className="banana-3d-container">
            <motion.div
                className="banana-3d-wrapper"
                animate={{
                    y: isSpeaking ? [-8, -20, -8] : [0, -12, 0],
                    rotateY: isSpeaking ? [-5, 5, -5] : [0, 0, 0],
                    rotateZ: isSpeaking ? [-3, 3, -3] : [-1, 1, -1],
                    scale: isSpeaking ? [1, 1.08, 1] : [1, 1.02, 1],
                }}
                transition={{
                    duration: isSpeaking ? 0.4 : 2.5,
                    repeat: Infinity,
                    ease: isSpeaking ? "easeInOut" : "easeInOut",
                }}
                style={{
                    transformStyle: "preserve-3d",
                    perspective: "1000px",
                }}
            >
                <Image
                    src="/banana-host-pixar.png"
                    alt="Plátano Presentador 3D"
                    width={400}
                    height={400}
                    className="banana-pixar-image"
                    priority
                    style={{
                        filter: isSpeaking
                            ? "drop-shadow(0 20px 50px rgba(255, 215, 0, 0.6)) brightness(1.1)"
                            : "drop-shadow(0 15px 40px rgba(0, 0, 0, 0.25))",
                        transform: "translateZ(20px)",
                    }}
                />

                {/* Sombra realista */}
                <motion.div
                    className="banana-shadow"
                    animate={{
                        scale: isSpeaking ? [1, 0.9, 1] : [1, 0.95, 1],
                        opacity: isSpeaking ? [0.3, 0.2, 0.3] : [0.3, 0.25, 0.3],
                    }}
                    transition={{
                        duration: isSpeaking ? 0.4 : 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </motion.div>
        </div>
    );
}

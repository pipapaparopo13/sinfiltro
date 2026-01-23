"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface QuiplashNotificationProps {
    show: boolean;
    playerName: string;
}

export function QuiplashNotification({ show, playerName }: QuiplashNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => setIsVisible(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [show]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            >
                {/* Background overlay with explosion effect */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black"
                />

                <div className="relative z-10 text-center">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [-5, 5, -5]
                        }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                        <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] stroke-black"
                            style={{ WebkitTextStroke: "4px white" }}>
                            ¡SINFILTRO!
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8"
                    >
                        <p className="text-4xl text-white font-bold mb-2">¡PLENO DE VOTOS!</p>
                        <div className="bg-white/20 backdrop-blur-md rounded-full px-8 py-4 inline-block border-2 border-white/50">
                            <p className="text-5xl font-black text-yellow-300 drop-shadow-lg">{playerName}</p>
                        </div>
                        <p className="text-3xl text-green-400 font-bold mt-4 animate-bounce">+1000 PUNTOS EXTRA</p>
                    </motion.div>
                </div>

                {/* Confetti particles */}
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: 0,
                            y: 0,
                            scale: 0
                        }}
                        animate={{
                            x: (Math.random() - 0.5) * 1000,
                            y: (Math.random() - 0.5) * 1000,
                            scale: [0, 1, 0],
                            rotate: Math.random() * 360
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute text-4xl"
                    >
                        {['🎉', '💥', '✨', '🏆', '⭐'][Math.floor(Math.random() * 5)]}
                    </motion.div>
                ))}
            </motion.div>
        </AnimatePresence>
    );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface StreakNotificationProps {
    wins: number;
    playerName: string;
}

export function StreakNotification({ wins, playerName }: StreakNotificationProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (wins >= 3) {
            setShow(true);
            const timer = setTimeout(() => setShow(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [wins]);

    if (!show || wins < 3) return null;

    const getStreakInfo = () => {
        if (wins >= 7) return { emoji: '👑', name: '¡LEGENDARIO!', color: 'from-purple-600 to-pink-600' };
        if (wins >= 5) return { emoji: '⚡', name: '¡IMPARABLE!', color: 'from-blue-600 to-cyan-600' };
        return { emoji: '🔥', name: '¡EN RACHA!', color: 'from-orange-600 to-red-600' };
    };

    const streak = getStreakInfo();

    return (
        <AnimatePresence>
            <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 10 }}
                transition={{ type: "spring", damping: 10 }}
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
            >
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [-2, 2, -2]
                    }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className={`bg-gradient-to-r ${streak.color} p-8 rounded-3xl border-4 border-white shadow-2xl`}
                >
                    <div className="text-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="text-8xl mb-2"
                        >
                            {streak.emoji}
                        </motion.div>
                        <h2 className="text-4xl font-black text-white mb-2">{streak.name}</h2>
                        <p className="text-2xl text-white font-bold">{playerName}</p>
                        <p className="text-xl text-white/90 mt-2">x{wins} victorias!</p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

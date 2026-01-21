"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-lobby">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center sinfiltro-logo-container"
            >
                {/* SINFILTRO Logo Image */}
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                >
                    <Image
                        src="/images/sinfiltro-logo.png"
                        alt="SINFILTRO - The Uncensored Party Game"
                        width={600}
                        height={300}
                        className="sinfiltro-logo-img"
                        priority
                    />
                </motion.div>

                <div className="flex flex-col md:flex-row gap-6 justify-center mt-8">
                    <Link href="/tv">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="glow-button text-xl px-12 py-5"
                        >
                            🖥️ Pantalla TV
                        </motion.button>
                    </Link>

                    <Link href="/join">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="glow-button text-xl px-12 py-5"
                        >
                            📱 Unirme
                        </motion.button>
                    </Link>
                </div>

                <Link href="/biblioteca" className="mt-8 block">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="glow-button text-xl px-12 py-5"
                    >
                        🧪 Laboratorio de Caos
                    </motion.button>
                </Link>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="mt-16 glass-card p-8 max-w-md mx-auto"
                >
                    <h3 className="text-lg font-bold mb-4">¿Cómo jugar?</h3>
                    <ol className="text-left text-gray-700 space-y-2">
                        <li>1. Abre <strong>"Pantalla TV"</strong> en una tele o monitor</li>
                        <li>2. Los jugadores escanean el QR con su móvil</li>
                        <li>3. ¡Escribe respuestas graciosas y vota!</li>
                    </ol>
                </motion.div>
            </motion.div>
        </main>
    );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROOM_WORDS } from "@/lib/gameLogic";
import { database, dbRef, get, remove } from "@/lib/firebase";

export default function TVRootPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Buscando sala disponible...");

    useEffect(() => {
        const findAndRedirectToRoom = async () => {
            try {
                setStatus("Conectando con el servidor...");
                const roomsSnapshot = await get(dbRef("rooms"));

                let existingRooms: Record<string, any> = {};
                if (roomsSnapshot.exists()) {
                    existingRooms = roomsSnapshot.val();
                }

                const availableWords: string[] = [];
                const recyclableWords: string[] = [];
                const now = Date.now();

                // Parametros para considerar una sala como "recyclable"
                const INACTIVE_THRESHOLD = 2 * 60 * 60 * 1000; // 2 horas sin actividad
                const ZOMBIE_THRESHOLD = 4 * 60 * 60 * 1000; // 4 horas desde creación (si no hay actividad)
                const FINISHED_THRESHOLD = 15 * 60 * 1000; // 15 minutos en PODIUM

                ROOM_WORDS.forEach(word => {
                    const room = existingRooms[word];

                    if (!room) {
                        // Sala no existe en DB, totalmente libre
                        availableWords.push(word);
                    } else {
                        // Sala existe, verificar si se puede reciclar
                        const lastActive = room.lastActive || room.createdAt;
                        const timeSinceActive = now - lastActive;
                        const isFinished = room.gameState?.status === 'PODIUM';

                        // Criterios de reciclaje:
                        // 1. Está terminada (PODIUM) desde hace un rato
                        // 2. Está inactiva desde hace mucho (2 horas)
                        // 3. Es muy vieja (4 horas)

                        if (
                            (isFinished && timeSinceActive > FINISHED_THRESHOLD) ||
                            (timeSinceActive > INACTIVE_THRESHOLD) ||
                            (now - room.createdAt > ZOMBIE_THRESHOLD)
                        ) {
                            recyclableWords.push(word);
                        }
                    }
                });

                let selectedRoom = "";
                let needsReset = false;

                if (availableWords.length > 0) {
                    // Preferir salas totalmente nuevas
                    selectedRoom = availableWords[Math.floor(Math.random() * availableWords.length)];
                    console.log(`✅ Sala disponible encontrada: ${selectedRoom}`);
                } else if (recyclableWords.length > 0) {
                    // Si no hay nuevas, reciclar una vieja
                    selectedRoom = recyclableWords[Math.floor(Math.random() * recyclableWords.length)];
                    needsReset = true;
                    console.log(`♻️ Reciclando sala inactiva/terminada: ${selectedRoom}`);
                } else {
                    // Caso extremo: todas ocupadas y activas. Usamos una aleatoria y esperamos lo mejor (o forzamos la más antigua)
                    // En este caso extremo, elegimos la que tenga el lastActive más antiguo
                    console.warn("⚠️ Todas las salas parecen ocupadas. Forzando la más antigua.");
                    let oldestWord = ROOM_WORDS[0];
                    let oldesTime = Infinity;

                    ROOM_WORDS.forEach(word => {
                        const room = existingRooms[word];
                        const time = room?.lastActive || room?.createdAt || Date.now();
                        if (time < oldesTime) {
                            oldesTime = time;
                            oldestWord = word;
                        }
                    });

                    selectedRoom = oldestWord;
                    needsReset = true;
                }

                if (needsReset) {
                    setStatus(`Limpiando sala ${selectedRoom}...`);
                    // Borrar la sala vieja para que los clientes conectados se desconecten
                    // y el nuevo host pueda crearla limpia
                    try {
                        await remove(dbRef(`rooms/${selectedRoom}`));
                    } catch (e) {
                        console.error("Error limpiando sala:", e);
                    }
                }

                setStatus(`Entrando a ${selectedRoom}...`);
                router.replace(`/tv/${selectedRoom}`);

            } catch (error) {
                console.error("Error buscando sala:", error);
                // Fallback: elegir una al azar si falla Firebase
                const randomRoom = ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
                router.replace(`/tv/${randomRoom}`);
            }
        };

        findAndRedirectToRoom();
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <div className="text-xl font-bold">{status}</div>
            </div>
        </main>
    );
}

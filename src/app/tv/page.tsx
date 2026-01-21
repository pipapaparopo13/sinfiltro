"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateRoomId } from "@/lib/gameLogic";

export default function TVRootPage() {
    const router = useRouter();

    useEffect(() => {
        // Generate a new room code and redirect
        const newRoomCode = generateRoomId();
        router.replace(`/tv/${newRoomCode}`);
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="text-2xl text-gray-400">Creando sala...</div>
        </main>
    );
}

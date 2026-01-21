"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinWithCode({ params }: { params: { roomCode: string } }) {
    const router = useRouter();
    const roomCode = params.roomCode.toUpperCase();

    useEffect(() => {
        // Redirect to the main join page with room query param
        router.replace(`/join?room=${roomCode}`);
    }, [router, roomCode]);

    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="text-xl">Cargando...</div>
        </main>
    );
}

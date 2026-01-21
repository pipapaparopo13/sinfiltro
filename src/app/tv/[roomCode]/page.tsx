"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { database, dbRef, set, onValue, update, get } from "@/lib/firebase";
import {
    generateRoomId,
    createInitialGameState,
    distributePrompts,
    calculateScore,
    GameState,
    Player,
    Match,
} from "@/lib/gameLogic";
import { getRandomPrompts } from "@/data/prompts";
import GameHost from "@/app/components/GameHost";
import { useGameAudio } from "@/lib/useGameAudio";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";

interface ChatMessage {
    id: string;
    text: string;
    timestamp: number;
    x: number; // Random position
    y: number;
    rotation?: number;
}

export default function TVPage({ params }: { params: { roomCode: string } }) {
    const roomCode = params.roomCode.toUpperCase();
    const router = useRouter();
    const [roomId, setRoomId] = useState<string>("");
    const [players, setPlayers] = useState<{ [key: string]: Player }>({});
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());
    const [matches, setMatches] = useState<Match[]>([]);
    const [timer, setTimer] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    // Audio system
    const { playSound, playMusic, stopMusic, initAudio } = useGameAudio();
    const prevStatusRef = useRef<string>("");
    const prevPlayerCountRef = useRef<number>(0);

    // Conectar o crear sala al montar (solo en cliente)
    useEffect(() => {
        setMounted(true);
        setRoomId(roomCode);

        console.log("📺 TV: Initializing room:", roomCode);

        // Check if room exists, if not create it
        const roomRef = dbRef(`rooms/${roomCode}`);
        onValue(
            roomRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    console.log("📺 TV: Room doesn't exist, creating new room:", roomCode);
                    // Room doesn't exist, create it
                    set(roomRef, {
                        id: roomCode,
                        createdAt: Date.now(),
                        lastActive: Date.now(),
                        hostId: "",
                        gameState: createInitialGameState(),
                        players: {},
                        matches: [],
                        prompts: [],
                    });
                } else {
                    const roomData = snapshot.val();
                    // Update heartbeat on connect
                    update(roomRef, { lastActive: Date.now() });

                    const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
                    console.log("📺 TV: Room already exists with", playerCount, "players:", roomData.players);
                }
                // If room exists, we're reconnecting - just listen to changes
            },
            { onlyOnce: true }
        );

        // Cleanup: Do NOT delete room on unmount (for reconnection)
        // Only the creator should delete when explicitly closing
    }, [roomCode]);

    // Escuchar cambios en la sala
    useEffect(() => {
        if (!roomId) return;

        console.log("📺 TV: Setting up listeners for room:", roomId);

        const playersRef = dbRef(`rooms/${roomId}/players`);
        const gameStateRef = dbRef(`rooms/${roomId}/gameState`);
        const matchesRef = dbRef(`rooms/${roomId}/matches`);
        const roomRef = dbRef(`rooms/${roomId}`);

        // Listen for room closure
        const unsubRoom = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (data.isClosed) {
                    console.log("🚫 TV: Room closed by host. Redirecting to new room...");
                    router.replace('/tv');
                }
            }
        });

        const unsubPlayers = onValue(playersRef, (snapshot) => {
            console.log("📺 TV: Players listener callback fired! snapshot.exists():", snapshot.exists());
            if (snapshot.exists()) {
                const playerData = snapshot.val();
                console.log("📺 TV: Players updated from Firebase:", Object.keys(playerData).length, playerData);
                setPlayers(playerData);
            } else {
                console.log("📺 TV: No players in room");
            }
        }, (error) => {
            console.error("❌ TV: Error in players listener:", error);
        });

        const unsubGameState = onValue(gameStateRef, (snapshot) => {
            if (snapshot.exists()) {
                setGameState(snapshot.val());
            }
        });

        const unsubMatches = onValue(matchesRef, (snapshot) => {
            if (snapshot.exists()) {
                setMatches(Object.values(snapshot.val()));
            }
        });

        // Listen for chat messages
        const chatRef = dbRef(`rooms/${roomId}/chat`);
        const unsubChat = onValue(chatRef, (snapshot) => {
            if (snapshot.exists()) {
                const messages = snapshot.val();
                const messageList: ChatMessage[] = Object.entries(messages).map(([id, msg]: [string, any]) => ({
                    id,
                    text: msg.text,
                    timestamp: msg.timestamp,
                    x: Math.random() * 30 + 55, // 55-85% from left (right side only)
                    y: Math.random() * 40 + 30, // 30-70% from top (middle area)
                    rotation: Math.random() * 10 - 5,
                }));
                // Keep only last 10 messages
                setChatMessages(messageList.slice(-10));
            } else {
                setChatMessages([]);
            }
        });

        return () => {
            unsubPlayers();
            unsubGameState();
            unsubMatches();
            unsubChat();
            unsubRoom();
        };
    }, [roomId]);

    // Sound effects on game state changes
    useEffect(() => {
        if (prevStatusRef.current !== gameState.status) {
            const prevStatus = prevStatusRef.current;
            prevStatusRef.current = gameState.status;

            // Play sounds based on state transitions
            switch (gameState.status) {
                case "INPUT":
                    if (prevStatus === "LOBBY") {
                        playSound("start");
                        playMusic("gameplay");
                    }
                    break;
                case "VOTING":
                    playSound("whoosh");
                    playMusic("voting");
                    break;
                case "PODIUM":
                    playSound("podium");
                    stopMusic();
                    break;
            }
        }
    }, [gameState.status, playSound, playMusic, stopMusic]);

    // Sound when player joins
    useEffect(() => {
        const currentCount = Object.keys(players).length;
        if (currentCount > prevPlayerCountRef.current && prevPlayerCountRef.current > 0) {
            playSound("join");
        }
        prevPlayerCountRef.current = currentCount;
    }, [players, playSound]);

    // Play sound when results are revealed
    useEffect(() => {
        if (showResults) {
            playSound("winner");
        }
    }, [showResults, playSound]);

    const [penalizedPlayers, setPenalizedPlayers] = useState<string[]>([]);

    // Timer countdown
    // Timer countdown
    useEffect(() => {
        if (gameState.status === "INPUT" || gameState.status === "VOTING") {
            const calculateRemaining = () => {
                if (gameState.phaseEndTime) {
                    const remaining = Math.max(0, Math.ceil((gameState.phaseEndTime - Date.now()) / 1000));
                    return remaining;
                } else {
                    // Fallback to legacy local timer behavior if no timestamp
                    return gameState.status === "INPUT" ? gameState.inputTimeLimit : gameState.voteTimeLimit;
                }
            };

            // Set initial value immediately
            setTimer(calculateRemaining());

            const interval = setInterval(() => {
                const remaining = calculateRemaining();
                setTimer(remaining);

                if (remaining <= 0) {
                    clearInterval(interval);

                    // Only trigger end-of-phase logic if we are the "host" TV instance 
                    // (prevent multiple triggers if logic was elsewhere, but here logic is in TV so it's fine)
                    if (gameState.status === "INPUT") {
                        handleInputTimeUp();
                    } else if (gameState.status === "VOTING" && !showResults) {
                        handleVotingTimeUp();
                    }
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [gameState.status, gameState.currentMatchIndex, gameState.phaseEndTime]);

    const handleVotingTimeUp = useCallback(async () => {
        if (!roomId || !matches[gameState.currentMatchIndex]) return;

        const currentMatch = matches[gameState.currentMatchIndex];
        const playerList = Object.values(players);

        // Identify eligible voters (everyone except the two competing players)
        const eligibleVoters = playerList.filter(
            p => p.id !== currentMatch.playerA && p.id !== currentMatch.playerB && !p.isSpectator
        );

        // Identify who actually voted
        const votedIds = new Set([
            ...(currentMatch.votesA || []),
            ...(currentMatch.votesB || [])
        ]);

        // Find sluggards (lazy players who didn't vote)
        const sluggards = eligibleVoters.filter(p => !votedIds.has(p.id));

        if (sluggards.length > 0) {
            console.log("🐌 Lazy voters detected:", sluggards.map(p => p.name));

            // Prepare updates for Firebase
            const updates: Record<string, number> = {};
            const penalizedIds: string[] = [];

            sluggards.forEach(p => {
                // Deduct 20 points
                updates[`players/${p.id}/score`] = (p.score || 0) - 20;
                penalizedIds.push(p.id);
            });

            // Apply penalties
            await update(dbRef(`rooms/${roomId}`), updates);

            // Trigger animation locally
            setPenalizedPlayers(penalizedIds);
            playSound("fail"); // Make sure this sound exists or use another one

            // Clear animation after 3 seconds
            setTimeout(() => {
                setPenalizedPlayers([]);
            }, 3000);
        }

        // Proceed to reveal results
        revealResults();

    }, [roomId, matches, gameState.currentMatchIndex, players, playSound]);

    const handleInputTimeUp = useCallback(async () => {
        if (!roomId) return;

        console.log("⏰ TV: Time is up! Changing to VOTING...");

        // First change to VOTING so mobile clients can auto-submit
        await update(dbRef(`rooms/${roomId}/gameState`), {
            status: "VOTING",
            currentMatchIndex: 0,
            phaseEndTime: Date.now() + 22000, // 20s + 2s buffer for auto-submits
        });

        // Wait 2 seconds for mobile clients to auto-submit their responses
        console.log("⏳ Waiting 2 seconds for mobile auto-submits...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Now read the FRESH data from Firebase (after mobiles had time to submit)
        console.log("📥 Reading fresh match data from Firebase...");
        const matchesSnapshot = await get(dbRef(`rooms/${roomId}/matches`));

        if (!matchesSnapshot.exists()) {
            console.log("❌ No matches found");
            return;
        }

        const freshMatches = matchesSnapshot.val() as Match[];
        let hasChanges = false;

        // Fill ONLY the responses that are still empty after mobile auto-submit
        for (let i = 0; i < freshMatches.length; i++) {
            const match = freshMatches[i];

            // Check Player A
            if (!match.responseA || match.responseA.trim() === "") {
                console.log(`🤖 AI: Generating response A for match ${i} (player didn't write anything)...`);
                try {
                    const res = await fetch('/api/generate-ai-response', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ promptText: match.promptText }),
                    });
                    const data = await res.json();
                    freshMatches[i].responseA = data.response || "¡Me distraje con una mosca! 🤖";
                } catch (e) {
                    freshMatches[i].responseA = "¡Error de sistema! 🤖";
                }
                hasChanges = true;
            } else {
                console.log(`✅ Match ${i} responseA already filled: "${match.responseA.substring(0, 20)}..."`);
            }

            // Check Player B
            if (!match.responseB || match.responseB.trim() === "") {
                console.log(`🤖 AI: Generating response B for match ${i} (player didn't write anything)...`);
                try {
                    const res = await fetch('/api/generate-ai-response', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ promptText: match.promptText }),
                    });
                    const data = await res.json();
                    freshMatches[i].responseB = data.response || "Mi disco duro está lleno de memes 🤖";
                } catch (e) {
                    freshMatches[i].responseB = "Error 404: Respuesta no encontrada 🤖";
                }
                hasChanges = true;
            } else {
                console.log(`✅ Match ${i} responseB already filled: "${match.responseB.substring(0, 20)}..."`);
            }
        }

        if (hasChanges) {
            console.log("🤖 TV: Updating matches with AI-filled responses...");
            await update(dbRef(`rooms/${roomId}`), {
                matches: freshMatches
            });
        } else {
            console.log("✅ All responses were already filled by players!");
        }
    }, [roomId]);

    // Auto-advance when all players have submitted for the CURRENT round
    useEffect(() => {
        if (gameState.status !== "INPUT") return;

        const playerList = Object.values(players);
        if (playerList.length === 0) return;

        const allSubmitted = playerList.every(player => player.submittedRound === gameState.currentRound);

        if (allSubmitted) {
            // Small delay for UX before transitioning
            const timeout = setTimeout(() => {
                handleInputTimeUp();
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [players, gameState.status, gameState.currentRound, handleInputTimeUp]);

    // Auto-reveal when all votes are in
    useEffect(() => {
        if (gameState.status !== "VOTING" || showResults) return;

        const currentMatch = matches[gameState.currentMatchIndex];
        if (!currentMatch) {
            console.log("📺 TV: No current match found for index", gameState.currentMatchIndex);
            return;
        }

        const playerList = Object.values(players);
        // Players who can vote (not the ones who wrote the responses)
        const eligibleVoters = playerList.filter(
            p => p.id !== currentMatch.playerA && p.id !== currentMatch.playerB
        );

        console.log("📺 TV: Vote check - Match", gameState.currentMatchIndex + 1, "of", matches.length);
        console.log("📺 TV: playerA:", currentMatch.playerA, "playerB:", currentMatch.playerB);
        console.log("📺 TV: Total players:", playerList.length, "Eligible voters:", eligibleVoters.length);
        console.log("📺 TV: votesA:", currentMatch.votesA?.length || 0, "votesB:", currentMatch.votesB?.length || 0);

        if (eligibleVoters.length === 0) {
            console.log("📺 TV: No eligible voters, skipping auto-reveal");
            return;
        }

        const totalVotes = (currentMatch.votesA?.length || 0) + (currentMatch.votesB?.length || 0);
        const allVoted = totalVotes >= eligibleVoters.length;

        console.log("📺 TV: Total votes:", totalVotes, "All voted?", allVoted);

        if (allVoted) {
            console.log("✅ TV: All votes are in! Revealing results in 500ms...");
            // Small delay before revealing
            const timeout = setTimeout(() => {
                revealResults();
            }, 500);
            return () => clearTimeout(timeout);
        } else {
            console.log("⏳ TV: Waiting for more votes... (", totalVotes, "/", eligibleVoters.length, ")");
        }
    }, [matches, gameState.status, gameState.currentMatchIndex, players, showResults]);

    // Auto-advance 10 seconds after showing results (TV is non-interactive)
    useEffect(() => {
        if (!showResults || gameState.status !== "VOTING") return;

        const autoAdvanceTimer = setTimeout(() => {
            advanceToNextMatch();
        }, 10000); // 10 seconds

        return () => clearTimeout(autoAdvanceTimer);
    }, [showResults, gameState.status, gameState.currentMatchIndex]);

    // Heartbeat: Update lastActive every 2 minutes to prevent room recycling while active
    useEffect(() => {
        if (!roomId) return;

        const updateHeartbeat = () => {
            if (document.visibilityState === 'visible') {
                update(dbRef(`rooms/${roomId}`), {
                    lastActive: Date.now()
                }).catch(e => console.error("Heartbeat error", e));
            }
        };

        // Update on mount
        updateHeartbeat();

        const interval = setInterval(updateHeartbeat, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, [roomId]);

    // Avanzar al siguiente match
    const advanceToNextMatch = async () => {
        if (!roomId) return;

        const nextIndex = gameState.currentMatchIndex + 1;

        if (nextIndex >= matches.length) {
            // Fin de la ronda
            if (gameState.currentRound >= gameState.totalRounds) {
                // Fin del juego
                await update(dbRef(`rooms/${roomId}/gameState`), { status: "PODIUM" });
            } else {
                // Siguiente ronda
                const prompts = getRandomPrompts(Object.keys(players).filter(id => !players[id]?.isSpectator).length);
                const activePlayers = Object.keys(players).filter(id => !players[id]?.isSpectator);
                const newMatches = distributePrompts(activePlayers, prompts);

                // Reset all players' submission status for the new round
                const playerUpdates: Record<string, unknown> = {};
                activePlayers.forEach(id => {
                    playerUpdates[`players/${id}/hasSubmitted`] = false;
                    playerUpdates[`players/${id}/submittedRound`] = null;
                    playerUpdates[`players/${id}/responses`] = {};
                });

                console.log("🔄 TV: Starting new round - resetting player submission states");

                await update(dbRef(`rooms/${roomId}`), {
                    matches: newMatches,
                    gameState: {
                        ...gameState,
                        status: "INPUT",
                        currentRound: gameState.currentRound + 1,
                        currentMatchIndex: 0,
                        phaseEndTime: Date.now() + 90000,
                    },
                    ...playerUpdates,
                });
            }
        } else {
            // Siguiente match
            await update(dbRef(`rooms/${roomId}/gameState`), {
                currentMatchIndex: nextIndex,
                status: "VOTING",
                phaseEndTime: Date.now() + 20000,
            });
        }
        setShowResults(false);
    };

    // Revelar resultados del match actual
    const revealResults = async () => {
        console.log("🎯 TV: revealResults() called for match", gameState.currentMatchIndex);

        if (!roomId || !matches[gameState.currentMatchIndex]) {
            console.log("❌ TV: Cannot reveal results - missing roomId or match");
            return;
        }

        const match = matches[gameState.currentMatchIndex];
        const allVotesA = match.votesA || [];
        const allVotesB = match.votesB || [];

        // Filter regular vs spectator votes
        const regularVotesA = allVotesA.filter(id => !players[id]?.isSpectator).length;
        const regularVotesB = allVotesB.filter(id => !players[id]?.isSpectator).length;

        const specVotesA = allVotesA.filter(id => players[id]?.isSpectator).length;
        const specVotesB = allVotesB.filter(id => players[id]?.isSpectator).length;

        // Scoring is based ONLY on regular votes
        const totalRegularVoters = regularVotesA + regularVotesB;
        const isLastRound = gameState.currentRound === gameState.totalRounds;

        console.log("📊 TV: Revealing results", {
            reg: { A: regularVotesA, B: regularVotesB },
            spec: { A: specVotesA, B: specVotesB }
        });

        // Points only from regular votes
        const scoreA = calculateScore(regularVotesA, totalRegularVoters, isLastRound);
        const scoreB = calculateScore(regularVotesB, totalRegularVoters, isLastRound);

        // Update scores in memory
        const currentPlayers = { ...players };
        if (currentPlayers[match.playerA]) currentPlayers[match.playerA].score += scoreA.total;
        if (currentPlayers[match.playerB]) currentPlayers[match.playerB].score += scoreB.total;

        await update(dbRef(`rooms/${roomId}/players`), currentPlayers);
        setShowResults(true);
        console.log("✅ TV: Results revealed and scores updated!");
    };

    const joinUrl = typeof window !== "undefined"
        ? `${window.location.origin}/join?room=${roomId}`
        : "";

    const playerList = Object.values(players);
    const currentMatch = matches[gameState.currentMatchIndex];

    // Show loading until mounted (prevents hydration mismatch)
    if (!mounted) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-lobby">
                <div className="text-2xl text-white font-bold">Cargando...</div>
            </main>
        );
    }

    // Get background class based on game phase
    const getBgClass = () => {
        switch (gameState.status) {
            case "LOBBY": return "bg-lobby";
            case "INPUT": return "bg-input";
            case "VOTING": return "bg-voting";
            case "RESULTS": return "bg-results";
            case "PODIUM": return "bg-podium";
            default: return "bg-lobby";
        }
    };

    return (
        <main className={`min-h-screen p-8 flex flex-col relative ${getBgClass()}`}>
            {/* Header */}
            <header className="flex justify-between items-start mb-8 relative z-50">
                {/* Game Info Bar (Match & Round & Room) - Centered in Header */}
                <div className="flex-1 flex justify-center absolute left-0 right-0 top-4 pointer-events-none">
                    <AnimatePresence>
                        {(gameState.status === "VOTING" || gameState.status === "RESULTS" || gameState.status === "INPUT") && (
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="pointer-events-auto"
                            >
                                <div className="bg-black/90 backdrop-blur-xl px-12 py-3 rounded-3xl border-2 border-white/20 shadow-2xl flex flex-col items-center gap-1">
                                    {/* Progress Row */}
                                    <div className="flex items-center gap-4 text-white font-black text-2xl uppercase tracking-tighter text-center">
                                        <span className="text-blue-400">Enfrentamiento {gameState.currentMatchIndex + 1} de {matches.length}</span>
                                        <span className="text-white/20 text-3xl font-light">|</span>
                                        <span className="text-pink-400">Ronda {gameState.currentRound} de {gameState.totalRounds}</span>
                                    </div>

                                    {/* Separator Line */}
                                    <div className="h-[2px] w-2/3 bg-white/10 rounded-full"></div>

                                    {/* Join Info Row */}
                                    <div className="flex items-center gap-2 text-white/90 font-bold text-lg uppercase tracking-widest text-center">
                                        <span>Únete como espectador:</span>
                                        <span className="text-yellow-400 font-extrabold bg-white/10 px-4 py-1 rounded-xl border border-white/10 ml-2">
                                            {roomId}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="ml-auto flex items-center gap-6">
                    {/* QR Code mini */}
                    {gameState.status === 'LOBBY' && (
                        <div className="bg-white p-2 rounded-xl border-3 border-black shadow-md">
                            <QRCodeSVG value={joinUrl} size={80} />
                        </div>
                    )}
                    {/* Room code */}
                    <div className={`room-code-display ${gameState.status !== 'LOBBY' ? 'minimized' : ''}`}>
                        {roomId}
                    </div>
                </div>
            </header>

            {/* Game Host Presenter - Top Left Fixed - Only in LOBBY */}
            {gameState.status === "LOBBY" && (
                <GameHost
                    phase={gameState.status as "LOBBY" | "INPUT" | "VOTING" | "RESULTS" | "PODIUM"}
                    playerCount={playerList.filter(p => !p.isSpectator).length}
                    playerNames={playerList.filter(p => !p.isSpectator).map(p => p.name)}
                    winnerName={undefined}
                    showResults={showResults}
                />
            )}


            {/* Contenido principal según estado */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    {/* LOBBY */}
                    {gameState.status === "LOBBY" && (
                        <motion.div
                            key="lobby"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative w-full h-full min-h-[70vh]"
                        >
                            {/* Floating chat messages - positioned in safe zones */}
                            {chatMessages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ scale: 0, opacity: 0, y: 10 }}
                                    animate={{
                                        opacity: [0, 1, 1, 0],
                                        scale: [0, 1, 1, 0.8],
                                        y: [10, 0, 0, -30]
                                    }}
                                    transition={{
                                        duration: 8,
                                        times: [0, 0.05, 0.9, 1],
                                        ease: "easeInOut"
                                    }}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 max-w-[200px]"
                                    style={{
                                        left: `${msg.x}%`,
                                        top: `${msg.y}%`,
                                    }}
                                >
                                    <div className="relative bg-white text-black px-4 py-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-lg leading-tight break-words"
                                        style={{ transform: `rotate(${msg.rotation || -2}deg)` }}
                                    >
                                        "{msg.text}"
                                        {/* Little tail for speech bubble */}
                                        <div className="absolute -bottom-3 left-4 w-4 h-4 bg-white border-r-4 border-b-4 border-black transform rotate-45"></div>
                                    </div>
                                </motion.div>
                            ))}

                            {/* Center Logo */}
                            <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-10">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 10 }}
                                >
                                    <Image
                                        src="/images/sinfiltro-logo.png"
                                        alt="SINFILTRO"
                                        width={400}
                                        height={200}
                                        className="drop-shadow-2xl"
                                        priority
                                    />
                                </motion.div>
                            </div>

                            {/* Players distributed around the logo */}
                            {(() => {
                                // Offsets from center - moved up 15%
                                const positions = [
                                    { x: -26, y: -35 },   // Top-left
                                    { x: 18, y: -35 },    // Top-right
                                    { x: 24, y: -15 },    // Right
                                    { x: 18, y: 7 },      // Bottom-right
                                    { x: -26, y: 7 },     // Bottom-left
                                    { x: -32, y: -15 },   // Left
                                    { x: -12, y: -40 },   // Top-center-left
                                    { x: 4, y: -40 },     // Top-center-right
                                ];

                                return playerList.filter(p => !p.isSpectator).map((player, index) => {
                                    const pos = positions[index % positions.length];
                                    return (
                                        <motion.div
                                            key={player.id}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: index * 0.15, type: "spring", damping: 12 }}
                                            className="absolute flex flex-col items-center"
                                            style={{
                                                left: `calc(50% + ${pos.x}%)`,
                                                top: `calc(40% + ${pos.y}%)`,
                                                transform: 'translate(-50%, -50%)'
                                            }}
                                        >
                                            <div className="relative">
                                                <PlayerAvatar
                                                    size={120}
                                                    avatar={player.avatar}
                                                    className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                                                />
                                                {player.isHost && (
                                                    <span className="absolute -top-5 -right-5 text-5xl animate-bounce">👑</span>
                                                )}
                                            </div>
                                            <div className="mt-3 bg-white px-6 py-2 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                                <span className="font-bold text-black text-lg">{player.name}</span>
                                            </div>
                                        </motion.div>
                                    );
                                });
                            })()}



                            {/* Player count indicator */}
                            <div className="absolute bottom-4 right-4 z-20">
                                <div className="bg-white/95 px-6 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <p className="text-2xl font-bold text-black text-center">
                                        {playerList.filter(p => !p.isSpectator).length}/8
                                    </p>
                                    <p className="text-xs text-black/60 text-center uppercase tracking-wide">Jugadores</p>
                                </div>
                            </div>

                        </motion.div>
                    )}

                    {/* INPUT PHASE */}
                    {gameState.status === "INPUT" && (
                        <motion.div
                            key="input"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            className="text-center"
                        >
                            <h2 className="text-8xl font-black mb-8 text-black drop-shadow-[4px_4px_0_rgba(255,255,255,1)] tracking-wide" style={{ fontFamily: 'var(--font-bangers)' }}>
                                ¡ESCRIBE ALGO GRACIOSO!
                            </h2>
                            <p className="text-3xl text-black font-bold mb-12">
                                Mira tu móvil y responde a tus prompts
                            </p>

                            {/* Timer */}
                            <motion.div
                                className="relative inline-flex items-center justify-center"
                                animate={timer <= 10 ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 0.5, repeat: timer <= 10 ? Infinity : 0 }}
                            >
                                <svg className="w-48 h-48 transform -rotate-90">
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        fill="none"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth="8"
                                    />
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        fill="none"
                                        stroke={timer <= 10 ? "#EF4444" : "url(#gradient)"}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray="553"
                                        strokeDashoffset={553 - (553 * timer) / gameState.inputTimeLimit}
                                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                    <defs>
                                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#667eea" />
                                            <stop offset="100%" stopColor="#f093fb" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <span className={`absolute text-6xl font-bold ${timer <= 10 ? 'timer-urgent text-red-500' : ''}`}>
                                    {timer}
                                </span>
                            </motion.div>

                            {/* Progreso de jugadores */}
                            <div className="mt-12 flex flex-wrap justify-center gap-4">
                                {playerList.filter(p => !p.isSpectator).map((player) => (
                                    <div key={player.id} className="relative">
                                        <PlayerAvatar
                                            size="lg"
                                            avatar={player.avatar}
                                            className={`transition-all ${player.submittedRound === gameState.currentRound ? 'opacity-100 scale-110 border-green-500' : 'opacity-50 grayscale'}`}
                                        />
                                        {player.submittedRound === gameState.currentRound && (
                                            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 shadow-lg">
                                                ✅
                                            </div>
                                        )}
                                        <p className="text-xs font-bold mt-2 text-black">{player.name}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* VOTING PHASE */}
                    {gameState.status === "VOTING" && currentMatch && (
                        <motion.div
                            key={`voting-${gameState.currentMatchIndex}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-7xl flex flex-col"
                        >
                            {/* Status and Progress - Top Side */}
                            <div className="mb-4 flex flex-col items-center">

                                {/* Status / Winner */}
                                {!showResults ? (
                                    <div className="text-center py-2 px-6 bg-white/50 rounded-full border-2 border-black/10">
                                        <p className="text-xl text-black font-bold">
                                            ⏳ Esperando votos...
                                        </p>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center"
                                    >
                                        <div className="text-3xl font-bold">
                                            {(() => {
                                                const match = currentMatch;
                                                const allVotesA = match?.votesA || [];
                                                const allVotesB = match?.votesB || [];
                                                const regA = allVotesA.filter(id => !players[id]?.isSpectator).length;
                                                const regB = allVotesB.filter(id => !players[id]?.isSpectator).length;
                                                const specA = allVotesA.filter(id => players[id]?.isSpectator).length;
                                                const specB = allVotesB.filter(id => players[id]?.isSpectator).length;

                                                if (regA > regB) {
                                                    return <span className="text-blue-500">🏆 ¡{players[match.playerA]?.name} gana!</span>;
                                                } else if (regB > regA) {
                                                    return <span className="text-pink-500">🏆 ¡{players[match.playerB]?.name} gana!</span>;
                                                } else {
                                                    if (specA > specB) {
                                                        return <span className="text-blue-500">⚖️ ¡{players[match.playerA]?.name} gana por el público!</span>;
                                                    } else if (specB > specA) {
                                                        return <span className="text-pink-500">⚖️ ¡{players[match.playerB]?.name} gana por el público!</span>;
                                                    }
                                                    return <span className="text-yellow-600">🤝 ¡Empate total!</span>;
                                                }
                                            })()}
                                        </div>
                                        <p className="text-black font-bold text-sm mt-1">
                                            Siguiente en 10 segundos...
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Main Content - Center */}
                            <div className="flex-1 flex flex-col justify-center">
                                {/* Prompt */}
                                <div className="prompt-card text-center mb-4">
                                    <p className="text-5xl md:text-6xl font-bold leading-tight">
                                        {currentMatch.promptText}
                                    </p>
                                </div>

                                {/* Respuestas */}
                                <div className="grid md:grid-cols-2 gap-6 mb-2">
                                    <motion.div
                                        initial={{ x: -100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className={`response-card relative pt-6 ${showResults
                                            ? (currentMatch.votesA?.filter(id => !players[id]?.isSpectator).length || 0) > (currentMatch.votesB?.filter(id => !players[id]?.isSpectator).length || 0)
                                                ? "bg-yellow-100 border-4 border-yellow-500 ring-8 ring-yellow-400/50 shadow-2xl shadow-yellow-500/40"
                                                : "border-gray-400 opacity-60"
                                            : ""
                                            }`}
                                    >
                                        <div className="absolute -top-5 left-4 bg-blue-500 text-white px-6 py-2 rounded-full font-bold shadow-lg text-2xl">
                                            A
                                        </div>
                                        <p className="text-3xl md:text-4xl font-bold text-center py-6">
                                            {currentMatch.responseA || "..."}
                                        </p>
                                        {showResults && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="text-center mt-2 border-t-2 border-gray-300 pt-4"
                                            >
                                                <p className="text-3xl font-bold text-yellow-600 mb-2">{currentMatch.votesA?.filter(id => !players[id]?.isSpectator).length || 0} votos</p>
                                                {(currentMatch.votesA?.filter(id => !players[id]?.isSpectator).length || 0) > (currentMatch.votesB?.filter(id => !players[id]?.isSpectator).length || 0) && (
                                                    <span className="text-3xl text-green-600 font-bold">🏆 GANADOR</span>
                                                )}
                                                <p className="text-gray-700 text-lg mt-2 font-bold">por {players[currentMatch.playerA]?.name}</p>
                                                {/* Votantes debajo */}
                                                <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                    {(currentMatch.votesA || []).map((voterId: string) => (
                                                        <div key={voterId} className="flex flex-col items-center">
                                                            <PlayerAvatar
                                                                size={50}
                                                                avatar={players[voterId]?.avatar}
                                                                className="border-2 border-black shadow-lg"
                                                            />
                                                            <span className="text-[10px] font-bold mt-0.5 text-gray-800">{players[voterId]?.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    <motion.div
                                        initial={{ x: 100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 1.5 }}
                                        className={`response-card relative pt-6 ${showResults
                                            ? (currentMatch.votesB?.filter(id => !players[id]?.isSpectator).length || 0) > (currentMatch.votesA?.filter(id => !players[id]?.isSpectator).length || 0)
                                                ? "bg-yellow-100 border-4 border-yellow-500 ring-8 ring-yellow-400/50 shadow-2xl shadow-yellow-500/40"
                                                : "border-gray-400 opacity-60"
                                            : ""
                                            }`}
                                    >
                                        <div className="absolute -top-5 left-4 bg-pink-500 text-white px-6 py-2 rounded-full font-bold shadow-lg text-2xl">
                                            B
                                        </div>
                                        <p className="text-3xl md:text-4xl font-bold text-center py-6">
                                            {currentMatch.responseB || "..."}
                                        </p>
                                        {showResults && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="text-center mt-2 border-t-2 border-gray-300 pt-4"
                                            >
                                                <p className="text-3xl font-bold text-yellow-600 mb-2">{currentMatch.votesB?.filter(id => !players[id]?.isSpectator).length || 0} votos</p>
                                                {(currentMatch.votesB?.filter(id => !players[id]?.isSpectator).length || 0) > (currentMatch.votesA?.filter(id => !players[id]?.isSpectator).length || 0) && (
                                                    <span className="text-3xl text-green-600 font-bold">🏆 GANADOR</span>
                                                )}
                                                <p className="text-gray-700 text-lg mt-2 font-bold">por {players[currentMatch.playerB]?.name}</p>
                                                {/* Votantes debajo */}
                                                <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                    {(currentMatch.votesB || []).map((voterId: string) => (
                                                        <div key={voterId} className="flex flex-col items-center">
                                                            <PlayerAvatar
                                                                size={50}
                                                                avatar={players[voterId]?.avatar}
                                                                className="border-2 border-black shadow-lg"
                                                            />
                                                            <span className="text-[10px] font-bold mt-0.5 text-gray-800">{players[voterId]?.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Fixed bottom padding to avoid overlap with ranking */}
                            <div className="h-40"></div>
                        </motion.div>
                    )}

                    {/* PODIUM */}
                    {gameState.status === "PODIUM" && (
                        <motion.div
                            key="podium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center w-full max-w-4xl"
                        >
                            <motion.div
                                className="glass-card p-6 mb-8 inline-block bg-white/95 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 10, stiffness: 100 }}
                            >
                                <h2 className="text-5xl font-extrabold text-black uppercase tracking-tighter">
                                    <span className="trophy-bounce">🏆</span> Resultados <span className="trophy-bounce">🏆</span>
                                </h2>
                            </motion.div>

                            {/* Top 3 Podium Display */}
                            <div className="flex justify-center items-end gap-4 mb-8">
                                {/* 2nd Place */}
                                {playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[1] && (
                                    <motion.div
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5, type: "spring" }}
                                        className="flex flex-col items-center"
                                    >
                                        <PlayerAvatar
                                            size={80}
                                            avatar={playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[1]?.avatar}
                                            className="border-4 border-gray-400 mb-2"
                                        />
                                        <div className="rank-badge silver mb-2">🥈</div>
                                        <p className="font-bold text-lg">{playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[1]?.name}</p>
                                        <p className="text-xl font-bold text-gray-400">{playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[1]?.score} pts</p>
                                        <div className="w-24 h-32 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg mt-2 border-4 border-black shadow-lg"></div>
                                    </motion.div>
                                )}

                                {/* 1st Place - Center & Tallest */}
                                {playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[0] && (
                                    <motion.div
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.8, type: "spring" }}
                                        className="flex flex-col items-center relative"
                                    >
                                        <motion.div
                                            animate={{ rotate: [0, -5, 5, -5, 0] }}
                                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                                            className="absolute -top-8 text-5xl"
                                        >
                                            👑
                                        </motion.div>
                                        <PlayerAvatar
                                            size={112}
                                            avatar={playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[0]?.avatar}
                                            className="border-4 border-yellow-400 mb-2 ring-4 ring-yellow-400/50"
                                        />
                                        <div className="rank-badge gold mb-2">🥇</div>
                                        <p className="font-bold text-2xl text-black drop-shadow-[0_2px_4px_rgba(255,215,0,0.8)]">{playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[0]?.name}</p>
                                        <p className="text-2xl font-bold text-black bg-yellow-400 px-4 py-1 rounded-full">{playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[0]?.score} pts</p>
                                        <div className="w-28 h-44 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t-lg mt-2 border-4 border-black shadow-xl"></div>
                                    </motion.div>
                                )}

                                {/* 3rd Place */}
                                {playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[2] && (
                                    <motion.div
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3, type: "spring" }}
                                        className="flex flex-col items-center"
                                    >
                                        <PlayerAvatar
                                            size={64}
                                            avatar={playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[2]?.avatar}
                                            className="border-4 border-amber-700 mb-2"
                                        />
                                        <div className="rank-badge bronze mb-2">🥉</div>
                                        <p className="font-bold">{playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[2]?.name}</p>
                                        <p className="text-lg font-bold text-amber-600">{playerList.filter(p => !p.isSpectator).sort((a, b) => b.score - a.score)[2]?.score} pts</p>
                                        <div className="w-20 h-24 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-lg mt-2 border-4 border-black shadow-lg"></div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Rest of players - Horizontal like during game */}
                            <div className="glass-card p-4 mt-4 bg-white/95 shadow-xl border-4 border-black">
                                <div className="flex justify-center items-end gap-6 flex-wrap">
                                    {playerList
                                        .filter(p => !p.isSpectator)
                                        .sort((a, b) => b.score - a.score)
                                        .map((player, idx) => (
                                            <motion.div
                                                key={player.id}
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 1 + idx * 0.1 }}
                                                className={`flex flex-col items-center p-2 rounded-lg ${idx === 0 ? 'bg-yellow-400/30 border-2 border-yellow-500' : idx === 1 ? 'bg-gray-300/30 border-2 border-gray-400' : idx === 2 ? 'bg-amber-400/30 border-2 border-amber-600' : ''}`}
                                            >
                                                <span className="text-xl mb-1">
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                                                </span>
                                                <PlayerAvatar
                                                    size={50}
                                                    avatar={player.avatar}
                                                    className="border-2 border-black"
                                                />
                                                <span className="text-sm font-bold mt-1 text-black">
                                                    {player.name}
                                                </span>
                                                <span className={`font-bold text-lg ${idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-600' : idx === 2 ? 'text-amber-700' : 'text-purple-700'}`}>
                                                    {player.score}
                                                </span>
                                            </motion.div>
                                        ))}
                                </div>
                            </div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 2 }}
                                className="mt-4 text-xl text-black font-bold"
                            >
                                🎮 El anfitrión puede reiniciar desde su móvil
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Global Ranking - Fixed Bottom */}
            {(gameState.status === "VOTING" || gameState.status === "RESULTS") && (
                <div className="fixed bottom-0 left-0 right-0 p-6 z-50">
                    <div className="glass-card p-4 bg-white/95 shadow-2xl border-4 border-black">
                        <div className="flex justify-center items-end gap-6 flex-wrap">
                            {playerList
                                .filter(p => !p.isSpectator)
                                .sort((a, b) => b.score - a.score)
                                .map((player, idx) => (
                                    <div
                                        key={player.id}
                                        className={`relative flex flex-col items-center p-2 rounded-xl transition-transform hover:scale-110 ${idx === 0 ? 'bg-yellow-400/30 border-2 border-yellow-500 ring-4 ring-yellow-400/20' : ''}`}
                                    >
                                        <AnimatePresence>
                                            {penalizedPlayers.includes(player.id) && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.5, y: 0 }}
                                                    animate={{ opacity: 1, scale: 1.5, y: -50 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
                                                >
                                                    <span className="text-4xl font-black text-red-600 drop-shadow-[2px_2px_0_white] shake-animation">
                                                        -20
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <span className="text-2xl mb-1">
                                            {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                                        </span>
                                        <PlayerAvatar
                                            size={60}
                                            avatar={player.avatar}
                                            className="border-3 border-black shadow-lg"
                                        />
                                        <p className="text-sm font-black mt-2 text-black uppercase">{player.name}</p>
                                        <p className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 rounded-full border border-yellow-300 -mt-1">{player.score} pts</p>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

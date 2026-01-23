"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { dbRef, set, onValue, update, push } from "@/lib/firebase";
import {
    generatePlayerId,
    createPlayer,
    getPlayerPrompts,
    GameState,
    Player,
    Match,
    AVATAR_CHARACTERS,
    generateAvatar,
} from "@/lib/gameLogic";
import { getRandomPrompts, getPromptsForGame } from "@/data/prompts";
import { distributePrompts } from "@/lib/gameLogic";
import { PlayerAvatar } from "@/app/components/PlayerAvatar";
import { getLibrary, CustomLibrary } from "@/lib/customPrompts";

function JoinContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const roomIdFromUrl = searchParams.get("room");

    const [roomId, setRoomId] = useState(() => {
        // Only use roomIdFromUrl, not sessionStorage for initial state
        // The auto-reconnect effect will handle reconnection if needed
        return roomIdFromUrl || "";
    });
    const [playerId, setPlayerId] = useState<string>("");
    const [playerName, setPlayerName] = useState("");
    const [isJoined, setIsJoined] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [error, setError] = useState("");
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [players, setPlayers] = useState<{ [key: string]: Player }>({});
    const [matches, setMatches] = useState<Match[]>([]);
    const [myPrompts, setMyPrompts] = useState<
        { promptIndex: number; promptText: string; isPlayerA: boolean }[]
    >([]);
    const [responses, setResponses] = useState<{ [key: number]: string }>({});
    const [hasVoted, setHasVoted] = useState(false);
    const [myScore, setMyScore] = useState(0);
    // Chat message state
    const [chatMessage, setChatMessage] = useState("");
    const [now, setNow] = useState(Date.now());

    // Update 'now' every second for timers
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Avatar selection state - now just selecting a character
    const [selectedCharacter, setSelectedCharacter] = useState(AVATAR_CHARACTERS[0]);

    // Custom library state
    const [libraryCode, setLibraryCode] = useState('');
    const [loadedLibrary, setLoadedLibrary] = useState<CustomLibrary | null>(null);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

    // Helper to update roomId and persist to sessionStorage
    const updateRoomId = useCallback((newRoomId: string) => {
        setRoomId(newRoomId);
        if (newRoomId) {
            sessionStorage.setItem("quiplash_room_id", newRoomId);
            console.log("💾 Saved roomId to sessionStorage:", newRoomId);
        } else {
            sessionStorage.removeItem("quiplash_room_id");
        }
    }, []);

    // Get or create player ID (unique per browser tab/session)
    useEffect(() => {
        // Use sessionStorage instead of localStorage so each tab has its own ID
        let id = sessionStorage.getItem("quiplash_player_id");
        if (!id) {
            id = generatePlayerId();
            sessionStorage.setItem("quiplash_player_id", id);
            console.log("🆕 Generated new player ID for this session:", id);
        } else {
            console.log("🔑 Using existing session player ID:", id);
        }
        setPlayerId(id);
    }, []);

    // Auto-reconnect if player is already in the room (e.g., after page refresh)
    useEffect(() => {
        console.log("🔍 Auto-reconnect check - playerId:", playerId, "roomId:", roomId, "isJoined:", isJoined);

        // Don't try to auto-reconnect if already joined
        if (isJoined) {
            console.log("⏸️ Auto-reconnect skipped: already joined");
            return;
        }

        if (!playerId) {
            console.log("⏸️ Auto-reconnect skipped: no playerId yet");
            return;
        }

        console.log("🔄 Checking for auto-reconnect...");

        const checkAndReconnect = async () => {
            try {
                const { get } = await import("@/lib/firebase");

                // Try to get saved roomId from sessionStorage
                const savedRoomId = sessionStorage.getItem("quiplash_room_id");
                const roomIdToCheck = roomId || savedRoomId;

                if (!roomIdToCheck) {
                    console.log("⏸️ Auto-reconnect skipped: no roomId in URL or storage");
                    return;
                }

                console.log("🔍 Checking room:", roomIdToCheck);

                const playersRef = dbRef(`rooms/${roomIdToCheck.toUpperCase()}/players`);
                const gameStateRef = dbRef(`rooms/${roomIdToCheck.toUpperCase()}/gameState`);

                console.log("📡 Fetching room data for auto-reconnect...");

                // Check if this player exists in the room
                const playersSnapshot = await get(playersRef);
                const gameStateSnapshot = await get(gameStateRef);

                const existingPlayers = playersSnapshot.val() || {};
                const currentGameState = gameStateSnapshot.val();

                console.log("📊 Room data:", {
                    roomId: roomIdToCheck,
                    playerCount: Object.keys(existingPlayers).length,
                    myIdInRoom: !!existingPlayers[playerId],
                    gameStatus: currentGameState?.status
                });

                if (existingPlayers[playerId]) {
                    // Player is already in this room - auto-reconnect
                    console.log("✅ Auto-reconnecting player to room:", roomIdToCheck.toUpperCase());
                    updateRoomId(roomIdToCheck.toUpperCase());
                    setPlayerName(existingPlayers[playerId].name);
                    setIsJoined(true);
                    setIsHost(existingPlayers[playerId].isHost);
                    setError("");


                    if (currentGameState) {
                        console.log("✅ [AUTO-RECONNECT] Setting gameState:", currentGameState.status);
                        setGameState(currentGameState);
                    } else {
                        console.log("⚠️ [AUTO-RECONNECT] WARNING: No gameState in room!");
                    }
                } else {
                    console.log("⚠️ Player not found in room, clearing saved roomId");
                    // Player is NOT in the room, clear any saved roomId
                    sessionStorage.removeItem("quiplash_room_id");
                    if (!roomId) {
                        // Only clear the roomId state if it came from storage
                        // (if it came from URL, leave it so user can join manually)
                        setRoomId("");
                    }
                }
            } catch (err) {
                console.error("❌ Error checking for auto-reconnect:", err);
                // On error, clear saved roomId to be safe
                sessionStorage.removeItem("quiplash_room_id");
            }
        };

        checkAndReconnect();
    }, [playerId, isJoined, updateRoomId]);

    // Listen to room changes
    useEffect(() => {
        console.log("🔄 Room listeners useEffect - roomId:", roomId, "isJoined:", isJoined, "playerId:", playerId);

        if (!roomId || !isJoined) {
            console.log("⏸️ Room listeners NOT active (missing roomId or not joined)");
            return;
        }

        console.log("✅ Setting up room listeners for room:", roomId);

        const gameStateRef = dbRef(`rooms/${roomId}/gameState`);
        const playersRef = dbRef(`rooms/${roomId}/players`);
        const matchesRef = dbRef(`rooms/${roomId}/matches`);

        const unsubGameState = onValue(gameStateRef, (snapshot) => {
            if (snapshot.exists()) {
                const newState = snapshot.val();
                console.log("🎮 Game state updated:", newState.status);
                setGameState(newState);
                setHasVoted(false); // Reset vote status on new match
            }
        }, (error) => {
            console.error("❌ Error in gameState listener:", error);
        });

        const unsubPlayers = onValue(playersRef, (snapshot) => {
            console.log("🔔 Players listener callback fired! snapshot.exists():", snapshot.exists());
            if (snapshot.exists()) {
                const playersData = snapshot.val();
                console.log("👥 Players updated from Firebase:", Object.keys(playersData).length, "players");
                setPlayers(playersData);
                if (playersData[playerId]) {
                    setMyScore(playersData[playerId].score);
                    console.log("📊 My score updated:", playersData[playerId].score);
                } else {
                    console.warn("⚠️ My player ID not found in players data!");
                }
            } else {
                console.log("⚠️ No players data in snapshot");
            }
        }, (error) => {
            console.error("❌ Error in players listener:", error);
        });

        const unsubMatches = onValue(matchesRef, (snapshot) => {
            if (snapshot.exists()) {
                const matchesData = Object.values(snapshot.val()) as Match[];
                console.log("🎯 Matches updated:", matchesData.length, "matches");
                setMatches(matchesData);
                // Update my prompts
                const prompts = getPlayerPrompts(playerId, matchesData);
                setMyPrompts(prompts);
            }
        });

        return () => {
            console.log("🔌 Unsubscribing from room listeners");
            unsubGameState();
            unsubPlayers();
            unsubMatches();
        };
    }, [roomId, isJoined, playerId]);

    // Track the last processed round to avoid resetting on every matches update
    const lastProcessedRound = useRef<number | null>(null);
    // Track if we already auto-submitted for this round
    const hasAutoSubmitted = useRef<number | null>(null);

    // Auto-submit responses when time runs out (status changes to VOTING)
    useEffect(() => {
        const autoSubmitResponses = async () => {
            if (!roomId || !playerId || !matches || myPrompts.length === 0) return;

            // Check if player already submitted manually
            const player = players[playerId];
            if (player?.submittedRound === gameState?.currentRound) {
                console.log("✅ Player already submitted for this round, skipping auto-submit");
                return;
            }

            // Prevent double auto-submit
            if (hasAutoSubmitted.current === gameState?.currentRound) {
                console.log("⏭️ Already auto-submitted for this round");
                return;
            }

            console.log("⏰ Time's up! Auto-submitting whatever player has written...");
            hasAutoSubmitted.current = gameState?.currentRound || null;

            // Submit whatever the player has written (even incomplete)
            for (const prompt of myPrompts) {
                const response = responses[prompt.promptIndex] || ""; // Empty if not written
                const field = prompt.isPlayerA ? "responseA" : "responseB";

                // Only submit if there's something written
                if (response.trim() !== "") {
                    console.log(`📝 Auto-submitting response for prompt ${prompt.promptIndex}: "${response.substring(0, 20)}..."`);
                    await update(dbRef(`rooms/${roomId}/matches/${prompt.promptIndex}`), {
                        [field]: response,
                    });
                } else {
                    console.log(`⚠️ No response written for prompt ${prompt.promptIndex}, AI will fill it`);
                }
            }

            // Mark as submitted
            await update(dbRef(`rooms/${roomId}/players/${playerId}`), {
                hasSubmitted: true,
                submittedRound: gameState?.currentRound || 1,
            });
        };

        // Trigger auto-submit when status changes to VOTING and player hasn't submitted
        if (gameState?.status === "VOTING" && players[playerId]?.submittedRound !== gameState?.currentRound) {
            autoSubmitResponses();
        }
    }, [gameState?.status, gameState?.currentRound, roomId, playerId, myPrompts, responses, players, matches]);

    // Clear responses and re-fetch prompts ONLY when round actually changes
    useEffect(() => {
        if (gameState?.status === "INPUT" && matches.length > 0) {
            const currentRound = gameState.currentRound;

            // Only reset if this is a NEW round we haven't processed yet
            if (lastProcessedRound.current !== currentRound) {
                console.log("🔄 New INPUT phase detected - Round", currentRound);
                console.log("📋 Previous processed round:", lastProcessedRound.current);
                console.log("📋 Current submittedRound:", players[playerId]?.submittedRound);

                // Mark this round as processed
                lastProcessedRound.current = currentRound;
                // Reset auto-submit flag for new round
                hasAutoSubmitted.current = null;

                // Reset local responses for the new round
                setResponses({});

                // Re-calculate my prompts from the current matches
                const prompts = getPlayerPrompts(playerId, matches);
                console.log("📝 My prompts for this round:", prompts.length);
                setMyPrompts(prompts);
            }
        }
    }, [gameState?.status, gameState?.currentRound, matches, playerId]);

    const handleJoin = async () => {
        if (!roomId.trim()) {
            setError("Introduce el código de la sala");
            return;
        }
        if (!playerName.trim()) {
            setError("Introduce tu nombre");
            return;
        }
        if (playerName.length > 15) {
            setError("El nombre es demasiado largo (máx. 15 caracteres)");
            return;
        }

        try {
            console.log("🎮 Attempting to join room:", roomId.toUpperCase(), "with playerId:", playerId);

            // Check for existing players and game state
            console.log("📍 Step 1: Creating refs...");
            const roomRef = dbRef(`rooms/${roomId.toUpperCase()}`);
            const playersRef = dbRef(`rooms/${roomId.toUpperCase()}/players`);
            const gameStateRef = dbRef(`rooms/${roomId.toUpperCase()}/gameState`);

            // Get existing players and game state using get() instead of onValue
            console.log("📍 Step 2: Checking if room exists...");
            const { get } = await import("@/lib/firebase");

            // First, verify the room exists (was created by TV)
            const roomSnapshot = await get(roomRef);
            if (!roomSnapshot.exists()) {
                console.log("❌ Room does not exist:", roomId.toUpperCase());
                setError("Esta sala no existe. Asegúrate de que la TV esté mostrando el código de sala.");
                return;
            }
            console.log("✅ Room exists!");

            console.log("📍 Step 3: Fetching players...");
            const playersSnapshot = await get(playersRef);
            console.log("📍 Step 3a: Players snapshot received");

            console.log("📍 Step 4: Fetching game state...");
            const gameStateSnapshot = await get(gameStateRef);
            console.log("📍 Step 4a: Game state snapshot received");

            console.log("📍 Step 5: Processing data...");
            const existingPlayers = playersSnapshot.val() || {};
            const playerCount = Object.keys(existingPlayers).length;
            const currentGameState = gameStateSnapshot.val();

            console.log("📊 Current players in room:", playerCount, existingPlayers);
            console.log("🎮 Game state:", currentGameState);

            // Check if this player is already in the room with the SAME name
            if (existingPlayers[playerId]) {
                if (existingPlayers[playerId].name === playerName.trim()) {
                    console.log("✅ Player already exists in room with same name, reconnecting...");
                    updateRoomId(roomId.toUpperCase());
                    setIsJoined(true);
                    setIsHost(existingPlayers[playerId].isHost);
                    setError("");

                    // CRITICAL: Set gameState so lobby renders
                    if (currentGameState) {
                        console.log("✅ [RECONNECT] Setting gameState:", currentGameState.status);
                        setGameState(currentGameState);
                    } else {
                        console.log("⚠️ [RECONNECT] WARNING: No gameState in room!");
                    }
                    return;
                } else {
                    // Same ID but different name - this is a different player in the same browser
                    // If game started, join as spectator
                    const gameHasStarted = currentGameState && currentGameState.status && currentGameState.status !== "LOBBY";
                    console.log("🔍 Game has started?", gameHasStarted, "Status:", currentGameState?.status);

                    // Create player with new ID
                    console.log("⚠️ Player ID exists but with different name. Generating new ID...");
                    const newPlayerId = generatePlayerId();
                    setPlayerId(newPlayerId);
                    sessionStorage.setItem("quiplash_player_id", newPlayerId);

                    const customAvatar = {
                        characterId: selectedCharacter.id,
                        characterName: selectedCharacter.name,
                        imageUrl: selectedCharacter.image
                    };

                    // Combine player name with character name
                    const fullPlayerName = `${playerName.trim()} - ${selectedCharacter.name}`;
                    const player = createPlayer(newPlayerId, fullPlayerName, false, customAvatar, gameHasStarted);

                    console.log("👤 Creating player with new ID:", player);

                    await set(
                        dbRef(`rooms/${roomId.toUpperCase()}/players/${newPlayerId}`),
                        player
                    );

                    updateRoomId(roomId.toUpperCase());
                    setIsJoined(true);
                    setIsHost(false);
                    setError("");

                    // CRITICAL: Set gameState so lobby renders
                    if (currentGameState) {
                        console.log("✅ [DUPLICATE ID] Setting gameState:", currentGameState.status);
                        setGameState(currentGameState);
                    } else {
                        console.log("⚠️ [DUPLICATE ID] WARNING: No gameState in room!");
                    }
                    return;
                }
            }

            // NEW PLAYER trying to join
            const gameHasStarted = currentGameState && currentGameState.status && currentGameState.status !== "LOBBY";
            console.log("🔍 NEW PLAYER: Game has started?", gameHasStarted, "Status:", currentGameState?.status);

            const willBeHost = playerCount === 0;

            // Create player with selected fruit character avatar
            const customAvatar = {
                characterId: selectedCharacter.id,
                characterName: selectedCharacter.name,
                imageUrl: selectedCharacter.image
            };

            // Combine player name with character name
            const fullPlayerName = `${playerName.trim()} - ${selectedCharacter.name}`;
            const player = createPlayer(playerId, fullPlayerName, willBeHost, customAvatar, gameHasStarted);

            console.log("👤 Creating player:", player);

            await set(
                dbRef(`rooms/${roomId.toUpperCase()}/players/${playerId}`),
                player
            );

            if (willBeHost) {
                await update(dbRef(`rooms/${roomId.toUpperCase()}`), {
                    hostId: playerId,
                });
                setIsHost(true);
            }

            updateRoomId(roomId.toUpperCase());
            setIsJoined(true);
            setError("");
            console.log("🎉 Successfully joined room!");
            console.log("🔍 DEBUG JOIN - currentGameState:", currentGameState);
            console.log("🔍 DEBUG JOIN - gameState status:", currentGameState?.status);

            // CRITICAL: Set initial gameState if it exists
            if (currentGameState) {
                console.log("✅ Setting initial gameState from room data");
                setGameState(currentGameState);
            } else {
                console.log("⚠️ WARNING: No gameState in room! This will cause the lobby not to render!");
            }
        } catch (err: any) {
            console.error("❌ Join error:", err);
            const errorMessage = err?.message || err?.code || String(err);
            setError(`Error al conectar: ${errorMessage.substring(0, 100)}`);
        }
    };

    const handleStartGame = async () => {
        const playerIds = Object.keys(players).filter(id => !players[id]?.isSpectator);
        if (playerIds.length < 3) {
            setError("Necesitas al menos 3 jugadores");
            return;
        }

        // Get prompts (custom or default)
        const prompts = await getPromptsForGame(playerIds.length, loadedLibrary?.id);
        const newMatches = distributePrompts(playerIds, prompts);

        await update(dbRef(`rooms/${roomId}`), {
            prompts,
            matches: newMatches,
            customLibrary: loadedLibrary?.id || null,
            gameState: {
                status: "INPUT",
                currentRound: 1,
                totalRounds: 2,
                timer: 90,
                currentMatchIndex: 0,
                inputTimeLimit: 90,
                voteTimeLimit: 20,
                phaseEndTime: Date.now() + 90000,
            },
        });
    };

    const handleLoadLibrary = async () => {
        if (!libraryCode.trim()) return;

        setLibraryLoading(true);
        const library = await getLibrary(libraryCode);
        setLibraryLoading(false);

        if (library) {
            setLoadedLibrary(library);
            setError('');
        } else {
            setError('Biblioteca no encontrada');
            setLoadedLibrary(null);
        }
    };

    const handleSubmitResponses = async () => {
        // Check if all prompts are filled
        const allFilled = myPrompts.every(prompt => responses[prompt.promptIndex] && responses[prompt.promptIndex].trim() !== "");

        if (!allFilled) {
            setError("¡Debes responder a todas las preguntas antes de enviar!");
            return;
        }

        setError(""); // Clear any previous error

        // Save responses to matches
        for (const prompt of myPrompts) {
            const response = responses[prompt.promptIndex] || "";
            const field = prompt.isPlayerA ? "responseA" : "responseB";
            await update(dbRef(`rooms/${roomId}/matches/${prompt.promptIndex}`), {
                [field]: response,
            });
        }

        // Mark as submitted
        await update(dbRef(`rooms/${roomId}/players/${playerId}`), {
            hasSubmitted: true,
            submittedRound: gameState?.currentRound || 1,
        });
    };

    const handleVote = async (choice: "A" | "B") => {
        if (!gameState || hasVoted) return;

        const matchIndex = gameState.currentMatchIndex;
        const match = matches[matchIndex];

        // Don't allow voting on your own prompt
        if (match.playerA === playerId || match.playerB === playerId) {
            return;
        }

        const field = choice === "A" ? "votesA" : "votesB";

        console.log("🗳️ Player voting:", playerId, "on choice:", choice);

        try {
            // Use transaction to prevent race conditions when multiple players vote simultaneously
            const { runTransaction } = await import("@/lib/firebase");
            const matchRef = dbRef(`rooms/${roomId}/matches/${matchIndex}/${field}`);

            await runTransaction(matchRef, (currentVotes) => {
                // currentVotes might be null if no votes yet
                const votes = currentVotes || [];

                // Check if this player already voted (prevent double voting)
                if (votes.includes(playerId)) {
                    console.log("⚠️ Player already voted, skipping");
                    return votes; // Return unchanged
                }

                // Add this player's vote
                console.log("✅ Adding vote. Previous votes:", votes.length);
                return [...votes, playerId];
            });

            setHasVoted(true);
            console.log("🎉 Vote successfully recorded!");
        } catch (error) {
            console.error("❌ Error voting:", error);
        }
    };

    const sendChatMessage = async () => {
        if (!chatMessage.trim() || !roomId) return;
        const chatRef = dbRef(`rooms/${roomId}/chat`);
        const newMessageRef = push(chatRef);
        await set(newMessageRef, {
            text: chatMessage.trim(),
            timestamp: Date.now(),
        });
        setChatMessage("");
    };

    const handlePlayAgain = async () => {
        console.log("🔄 Play Again - Resetting game state for all players");

        // Build player reset updates with proper Firebase paths
        const playerResets: Record<string, unknown> = {};
        Object.keys(players).forEach((id) => {
            // Don't reset spectators, just remove them
            if (players[id]?.isSpectator) {
                playerResets[`players/${id}`] = null; // Remove spectators
            } else {
                playerResets[`players/${id}/score`] = 0;
                playerResets[`players/${id}/hasSubmitted`] = false;
                playerResets[`players/${id}/submittedRound`] = null;
                playerResets[`players/${id}/responses`] = {};
            }
        });

        await update(dbRef(`rooms/${roomId}`), {
            ...playerResets,
            matches: [],
            gameState: {
                status: "LOBBY",
                currentRound: 1,
                totalRounds: 2,
                timer: 0,
                currentMatchIndex: 0,
                inputTimeLimit: 90,
                voteTimeLimit: 15,
            },
        });

        // Reset local state
        setResponses({});
        setMyPrompts([]);
    };

    const handleLeaveRoom = async () => {
        console.log("🚪 Leaving room:", roomId);

        try {
            if (isHost) {
                // Check if game is in LOBBY or PODIUM
                if (gameState?.status === "LOBBY") {
                    // Transfer host to another player
                    const otherPlayerIds = Object.keys(players).filter(id => id !== playerId && !players[id]?.isSpectator);

                    if (otherPlayerIds.length > 0) {
                        // Transfer host role to first available player
                        const newHostId = otherPlayerIds[0];
                        await update(dbRef(`rooms/${roomId}`), {
                            hostId: newHostId,
                            [`players/${newHostId}/isHost`]: true,
                        });
                        console.log("👑 Host transferred to:", newHostId);
                    }

                    // Remove this player from the room
                    await set(dbRef(`rooms/${roomId}/players/${playerId}`), null);
                } else if (gameState?.status === "PODIUM") {
                    // Game finished - close the room so TV creates a new one
                    await update(dbRef(`rooms/${roomId}`), { isClosed: true });
                } else {
                    // Game in progress - just remove player
                    await set(dbRef(`rooms/${roomId}/players/${playerId}`), null);
                }
            } else {
                // Not host - just remove this player from the room
                await set(dbRef(`rooms/${roomId}/players/${playerId}`), null);
            }

            // Clear local state
            sessionStorage.removeItem("quiplash_room_id");
            setIsJoined(false);
            setRoomId(roomIdFromUrl || "");
            setPlayerName("");
            setIsHost(false);
            setGameState(null);
            setPlayers({});
            setMatches([]);
            setMyPrompts([]);
            setResponses({});
            setMyScore(0);

            console.log("✅ Successfully left the room");
            router.push('/');
        } catch (err) {
            console.error("❌ Error leaving room:", err);
        }
    };

    const currentMatch = matches[gameState?.currentMatchIndex ?? 0];
    const isMyTurn =
        currentMatch &&
        (currentMatch.playerA === playerId || currentMatch.playerB === playerId);

    // 🐛 DEBUG: Log render state
    console.log("🎨 RENDER - isJoined:", isJoined, "| gameState:", gameState?.status || "NULL", "| players count:", Object.keys(players).length);

    // JOIN SCREEN
    if (!isJoined) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-lobby relative">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 w-full max-w-sm"
                >
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/images/sinfiltro-logo.png"
                            alt="SINFILTRO"
                            width={300}
                            height={150}
                            className="max-w-full h-auto"
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-black font-bold mb-2">
                                Código de sala
                            </label>
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                placeholder="BOLA"
                                maxLength={6}
                                className="w-full p-4 rounded-xl bg-gray-100 border-4 border-black text-xl text-center font-bold tracking-widest uppercase focus:outline-none focus:ring-4 focus:ring-purple-500/30 text-black placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-black font-bold mb-2">
                                Tu nombre
                            </label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                placeholder="Jugador"
                                maxLength={15}
                                className="w-full p-4 rounded-xl bg-gray-100 border-4 border-black text-lg focus:outline-none focus:ring-4 focus:ring-purple-500/30 text-black placeholder:text-gray-400"
                            />
                        </div>

                        {/* Character Selector - New Image-based System */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-black font-bold mb-4">
                                    Elige tu compañero SINFILTRO 🍇
                                </label>

                                <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto pb-2">
                                    {AVATAR_CHARACTERS.map((char) => {
                                        const isSelected = selectedCharacter.id === char.id;
                                        return (
                                            <motion.button
                                                key={char.id}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => setSelectedCharacter(char)}
                                                className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${isSelected
                                                    ? 'bg-purple-600 border-4 border-black scale-105 shadow-xl'
                                                    : 'bg-white/50 border-2 border-black/20'
                                                    }`}
                                            >
                                                <img
                                                    src={char.image}
                                                    alt={char.name}
                                                    className="w-14 h-14 object-cover rounded-full overflow-hidden"
                                                    style={{
                                                        objectPosition: 'center 15%', // Muestra más arriba para cortar el texto de abajo
                                                        transform: 'scale(1.25)' // Zoom un poco más agresivo para asegurar el corte
                                                    }}
                                                />
                                                <span className={`text-[8px] font-bold uppercase truncate w-full text-center mt-1 ${isSelected ? 'text-white' : 'text-black/60'}`}>
                                                    {char.name.split(' ')[0]}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preview Card */}
                            <div className="relative glass-card p-6 flex flex-col items-center justify-center overflow-hidden h-48 border-4 border-black rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                                <PlayerAvatar
                                    size={100}
                                    avatar={{
                                        characterId: selectedCharacter.id,
                                        characterName: selectedCharacter.name,
                                        imageUrl: selectedCharacter.image
                                    }}
                                />
                                <motion.p
                                    key={`${selectedCharacter.name}-text`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="mt-3 font-bold text-lg text-black"
                                >
                                    {selectedCharacter.name}
                                </motion.p>
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        )}

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleJoin}
                            className="glow-button w-full text-lg mt-4"
                        >
                            ¡A la batalla! 🎮
                        </motion.button>
                    </div>
                </motion.div>
            </main>
        );
    }

    // GAME SCREENS
    return (
        <main className="min-h-screen flex flex-col p-4 bg-lobby relative">
            {/* Header */}
            <header className="flex justify-between items-center mb-4 p-3 glass-card">
                <div className="flex items-center gap-2">
                    <PlayerAvatar
                        size="md"
                        avatar={players[playerId]?.avatar}
                    />
                    <div>
                        <span className="text-lg font-bold block">{playerName}</span>
                        {players[playerId]?.isSpectator && (
                            <span className="spectator-badge">👀 Espectador</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {gameState?.status === "LOBBY" && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleLeaveRoom}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg"
                        >
                            🚪 Salir
                        </motion.button>
                    )}
                    <motion.div
                        key={myScore}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className="text-center"
                    >
                        <span className="text-2xl font-bold text-black">{myScore}</span>
                        <span className="text-xs block text-black/70 italic">puntos</span>
                    </motion.div>
                </div>
            </header>


            <AnimatePresence mode="wait">
                {/* LOBBY */}
                {gameState?.status === "LOBBY" && (
                    <motion.div
                        key="lobby"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-start py-4 relative"
                    >
                        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center w-full px-2">
                            {isHost ? (
                                <div className="text-center w-full max-w-md px-2">
                                    <h2 className="text-xl font-bold mb-2">
                                        👑 Eres el anfitrión
                                    </h2>
                                    <p className="text-gray-400 mb-4 text-sm">
                                        {Object.keys(players).filter(id => !players[id]?.isSpectator).length} jugadores conectados
                                    </p>

                                    {/* Custom Library Section */}
                                    <div className="glass-card p-3 mb-4">
                                        <p className="text-sm font-bold text-black mb-2">📚 Usar biblioteca personalizada</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={libraryCode}
                                                onChange={(e) => setLibraryCode(e.target.value.toUpperCase())}
                                                placeholder="Código (ej: ABC123)"
                                                maxLength={6}
                                                className="flex-1 px-3 py-2 rounded-lg border-2 border-black/20 bg-white/70 text-black font-mono text-center uppercase"
                                            />
                                            <button
                                                onClick={handleLoadLibrary}
                                                disabled={libraryLoading || !libraryCode.trim()}
                                                className="bg-purple-500 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                                            >
                                                {libraryLoading ? '⏳' : '🔍'}
                                            </button>
                                        </div>
                                        {loadedLibrary && (
                                            <div className="mt-3 bg-green-100 text-green-800 p-2 rounded-lg text-sm">
                                                ✅ <strong>{loadedLibrary.name}</strong> ({loadedLibrary.prompts.length} preguntas)
                                                <button
                                                    onClick={() => { setLoadedLibrary(null); setLibraryCode(''); }}
                                                    className="ml-2 text-red-500 hover:text-red-700"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                        {!loadedLibrary && (
                                            <p className="text-xs text-black/50 mt-2">
                                                Deja vacío para usar las preguntas por defecto
                                            </p>
                                        )}
                                    </div>

                                    {Object.keys(players).filter(id => !players[id]?.isSpectator).length >= 3 ? (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleStartGame}
                                            className="glow-button text-lg py-4 px-10"
                                        >
                                            ¡EMPEZAR! 🚀
                                        </motion.button>
                                    ) : (
                                        <p className="text-gray-500">
                                            Esperando más jugadores (mín. 3)
                                        </p>
                                    )}
                                    {error && <p className="text-red-400 mt-4">{error}</p>}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-6xl mb-6">⏳</div>
                                    <h2 className="text-xl font-bold">
                                        Esperando al anfitrión...
                                    </h2>
                                    <p className="text-gray-400 mt-2">
                                        {Object.keys(players).length} jugadores conectados
                                    </p>
                                </div>
                            )}

                        </div>

                        {/* Chat input - fixed at bottom for LOBBY */}
                        <div className="w-full max-w-sm pb-4 px-2 z-20">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatMessage}
                                    onChange={(e) => setChatMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                                    placeholder="Escribe algo en la TV..."
                                    maxLength={50}
                                    className="flex-1 p-3 rounded-xl bg-white border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-black placeholder:text-gray-400 font-medium"
                                />
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={sendChatMessage}
                                    disabled={!chatMessage.trim()}
                                    className={`px-4 py-3 rounded-xl font-bold transition-all border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${chatMessage.trim()
                                        ? 'bg-purple-500 hover:bg-purple-400 text-white'
                                        : 'bg-gray-300 opacity-50 cursor-not-allowed text-gray-500'
                                        }`}
                                >
                                    📨
                                </motion.button>
                            </div>
                            <p className="text-xs text-black/60 text-center mt-2 font-medium">
                                ✨ Aparece en la TV
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* INPUT PHASE */}
                {gameState?.status === "INPUT" && (
                    <motion.div
                        key="input"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col"
                    >
                        {players[playerId]?.isSpectator ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-8xl"
                                >
                                    🍿
                                </motion.div>
                                <h2 className="text-3xl font-bold text-black">
                                    ¡Eres espectador!
                                </h2>
                                <p className="text-xl text-black font-semibold px-4">
                                    La partida ya ha empezado. Podrás votar para desempatar en un momento...
                                </p>
                            </div>
                        ) : players[playerId]?.submittedRound === gameState?.currentRound ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-8xl"
                                >
                                    🍹
                                </motion.div>
                                <h2 className="text-3xl font-bold text-black">
                                    ¡Todo listo!
                                </h2>
                                <p className="text-xl text-black font-semibold px-4">
                                    Relájate y disfruta hasta que todos envíen sus respuestas...
                                </p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-center mb-4 text-black">
                                    ¡Escribe tus respuestas!
                                </h2>

                                <div className="flex-1 space-y-4 overflow-auto">
                                    {myPrompts.map((prompt, idx) => (
                                        <motion.div
                                            key={prompt.promptIndex}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="glass-card p-4"
                                        >
                                            <p className="text-sm text-black font-bold mb-3">
                                                {prompt.promptText}
                                            </p>
                                            <textarea
                                                value={responses[prompt.promptIndex] || ""}
                                                onChange={(e) =>
                                                    setResponses({
                                                        ...responses,
                                                        [prompt.promptIndex]: e.target.value,
                                                    })
                                                }
                                                placeholder="Tu respuesta..."
                                                maxLength={100}
                                                rows={2}
                                                className="w-full p-3 rounded-xl bg-gray-100 border-4 border-black focus:outline-none focus:ring-4 focus:ring-purple-500/30 text-black placeholder:text-gray-400 resize-none"
                                            />
                                        </motion.div>
                                    ))}
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSubmitResponses}
                                    disabled={
                                        (players[playerId]?.submittedRound === gameState?.currentRound) ||
                                        !myPrompts.every(p => responses[p.promptIndex]?.trim())
                                    }
                                    className={`glow-button w-full mt-4 ${(players[playerId]?.submittedRound === gameState?.currentRound) ||
                                        !myPrompts.every(p => responses[p.promptIndex]?.trim())
                                        ? "opacity-50 cursor-not-allowed grayscale"
                                        : ""
                                        }`}
                                >
                                    {players[playerId]?.submittedRound === gameState?.currentRound
                                        ? "✓ Enviado"
                                        : !myPrompts.every(p => responses[p.promptIndex]?.trim())
                                            ? "Completa todas las preguntas"
                                            : "Enviar respuestas"}
                                </motion.button>
                                {error && <p className="text-red-500 font-bold text-center mt-2">{error}</p>}
                            </>
                        )}
                    </motion.div>
                )}

                {/* VOTING PHASE */}
                {gameState?.status === "VOTING" && currentMatch && (
                    <motion.div
                        key="voting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center"
                    >
                        {/* Mobile Timer */}
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-1 rounded-full font-bold z-10 border border-white/20 shadow-lg">
                            ⏱️ {Math.max(0, Math.ceil(((gameState.phaseEndTime || (now + 20000)) - now) / 1000))}s
                        </div>

                        {isMyTurn ? (
                            <div className="text-center">
                                <div className="text-6xl mb-4">🙈</div>
                                <h2 className="text-xl font-bold text-black">
                                    Es tu pregunta, ¡no puedes votar!
                                </h2>
                                <p className="text-black font-bold mt-2">
                                    Espera a que los demás voten
                                </p>
                            </div>
                        ) : hasVoted ? (
                            <div className="text-center">
                                <div className="text-6xl mb-4">✅</div>
                                <h2 className="text-xl font-bold text-black">¡Voto registrado!</h2>
                                <p className="text-black font-bold mt-2">
                                    Mira la pantalla para ver los resultados
                                </p>
                            </div>
                        ) : (
                            <div className="w-full max-w-md space-y-4">
                                <h2 className="text-lg font-bold text-center mb-6 text-black">
                                    {players[playerId]?.isSpectator ? "⚖️ Vota para desempatar" : "¡Elige tu favorita!"}
                                </h2>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleVote("A")}
                                    className="vote-button vote-button-a w-full text-left px-4 py-4"
                                >
                                    <span className="text-sm opacity-70 block mb-1">A</span>
                                    <span className="text-lg font-bold">{currentMatch.responseA || "..."}</span>
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleVote("B")}
                                    className="vote-button vote-button-b w-full text-left px-4 py-4"
                                >
                                    <span className="text-sm opacity-70 block mb-1">B</span>
                                    <span className="text-lg font-bold">{currentMatch.responseB || "..."}</span>
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* RESULTS / PODIUM */}
                {(gameState?.status === "RESULTS" ||
                    gameState?.status === "PODIUM") && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col items-center justify-center text-center"
                        >
                            <div className="text-6xl mb-4">👀</div>
                            <h2 className="text-xl font-bold">
                                ¡Mira la pantalla!
                            </h2>
                            <p className="text-3xl font-extrabold text-black mt-4">
                                Tu puntuación: {myScore}
                            </p>

                            {gameState?.status === "PODIUM" && (
                                <motion.div className="flex flex-col gap-4 mt-16 w-full max-w-xs">
                                    {isHost && (
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handlePlayAgain}
                                            className="glow-button w-full"
                                        >
                                            Jugar otra vez 🔄
                                        </motion.button>
                                    )}
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleLeaveRoom}
                                        className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl font-bold shadow-lg w-full transition-colors mt-8"
                                    >
                                        🚪 Salir al Menú
                                    </motion.button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
            </AnimatePresence>

            {/* LEAVE BUTTON & CONFIRMATION */}
            {
                isJoined && (
                    <div className="fixed bottom-2 left-0 right-0 px-4 z-[100] flex justify-center">
                        {showLeaveConfirmation ? (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="bg-white p-3 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-2 max-w-[280px] w-full"
                            >
                                <span className="text-black font-bold text-sm">¿Seguro que quieres abandonar?</span>
                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={() => {
                                            handleLeaveRoom();
                                            setShowLeaveConfirmation(false);
                                        }}
                                        className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                    >
                                        Sí, salir
                                    </button>
                                    <button
                                        onClick={() => setShowLeaveConfirmation(false)}
                                        className="flex-1 bg-gray-200 text-black py-2 rounded-xl font-bold text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                    >
                                        No
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <button
                                onClick={() => setShowLeaveConfirmation(true)}
                                className="bg-white/80 hover:bg-white text-black/60 font-bold text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-full border-2 border-black/20 hover:border-black/40 shadow-sm transition-all active:scale-95"
                            >
                                🚪 Abandonar partida
                            </button>
                        )}
                    </div>
                )
            }
        </main >
    );
}

export default function JoinPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen flex items-center justify-center">
                    <div className="text-xl">Cargando...</div>
                </main>
            }
        >
            <JoinContent />
        </Suspense>
    );
}

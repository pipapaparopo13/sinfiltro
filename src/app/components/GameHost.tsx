"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo, useRef } from "react";




type GamePhase = "LOBBY" | "INPUT" | "VOTING" | "RESULTS" | "PODIUM";

interface GameHostProps {
    phase: GamePhase;
    playerCount?: number;
    playerNames?: string[];
    winnerName?: string;
    matchInfo?: string;
    showResults?: boolean;
}

// Frases genéricas por fase
const HOST_PHRASES: Record<GamePhase, string[]> = {
    LOBBY: [
        "¡Bienvenidos al show más absurdo de internet!",
        "¿Preparados para decir barbaridades?",
        "¡Invita a más gente! Cuantos más, mejor... o peor",
        "Esperando cerebros creativos... o lo que tengáis",
        "¿Habéis cenado? Porque esto va a ser largo y absurdo",
        "Consejo: las respuestas absurdas ganan. Siempre.",
        "La vergüenza está prohibida aquí",
        "Ni ChatGPT podría ganar esto... ¿o sí?",
    ],
    INPUT: [
        "¡A ver qué disparates escribís!",
        "¡Sed creativos! O al menos, intentadlo...",
        "Si no sabéis qué poner, poned algo raro",
        "¡Escribid como si nadie os juzgara!",
        "¡Dale caña al teclado! Tic tac...",
        "La respuesta perfecta no existe... pero la absurda sí",
    ],
    VOTING: [
        "¡Hora de juzgar sin piedad!",
        "Votad con el corazón... o con el estómago",
        "¡El momento de la verdad!",
        "¡Que gane el más absurdo!",
        "Este enfrentamiento está que arde 🔥",
    ],
    RESULTS: [
        "¡Y el ganador del absurdo es...!",
        "¡Qué respuestas, madre mía!",
        "¡El público ha hablado!",
        "¡Esto es arte del absurdo!",
    ],
    PODIUM: [
        "¡Se acabó! ¡Sois todos unos cracks!",
        "¡Ha sido un honor presentar este caos!",
        "¡Hasta la próxima, campeones del absurdo!",
        "¡Menudo espectáculo habéis dado!",
    ],
};

// Frases que mencionan jugadores - {PLAYER} será reemplazado
const PLAYER_PHRASES: Record<GamePhase, string[]> = {
    LOBBY: [
        "Ya sé que {PLAYER} es muy malo, ¡pero dale una oportunidad!",
        "¿{PLAYER}? Esto va a ser interesante...",
        "Con {PLAYER} aquí, esto se pone bueno",
        "¡Ojo con {PLAYER}, tiene pinta de ser el gracioso!",
        "{PLAYER} está listo para dominar",
        "Me han dicho que {PLAYER} es el más loco del grupo",
        "¡{PLAYER} ha llegado! Ahora sí empieza la fiesta",
        "Apuesto 5€ a que {PLAYER} dice algo raro",
        "{PLAYER} tiene cara de ganar... o de perder. Una de dos.",
        "¡Cuidado con {PLAYER}! Dicen que no tiene filtros",
    ],
    INPUT: [
        "¡Venga {PLAYER}, sorpréndenos!",
        "Me pregunto qué estará escribiendo {PLAYER}...",
        "{PLAYER}, más vale que sea bueno",
        "¿Qué locura habrá puesto {PLAYER}?",
        "Apuesto a que {PLAYER} está pensando algo raro",
        "{PLAYER} tiene pinta de estar escribiendo oro puro",
    ],
    VOTING: [
        "¿Será esta la respuesta de {PLAYER}?",
        "Hmm... esto huele a {PLAYER}",
        "Votad pensando en {PLAYER}... o no",
    ],
    RESULTS: [
        "¡{PLAYER} va subiendo!",
        "¿Quién se esperaba esto de {PLAYER}?",
    ],
    PODIUM: [
        "¡Gran partida, {PLAYER}!",
        "{PLAYER} lo ha dado todo",
    ],
};

export default function GameHost({
    phase,
    playerCount = 0,
    playerNames = [],
    winnerName,
    matchInfo,
    showResults = false,
}: GameHostProps) {
    const [currentPhrase, setCurrentPhrase] = useState("");
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [displayedText, setDisplayedText] = useState("");

    // Función para obtener una frase (genérica o con nombre)
    const getRandomPhrase = (phaseKey: GamePhase, names: string[]): string => {
        // 50% probabilidad de usar frase con nombre si hay jugadores
        const usePlayerPhrase = names.length > 0 && Math.random() > 0.5;

        if (usePlayerPhrase) {
            const playerPhrases = PLAYER_PHRASES[phaseKey];
            const randomPhrase = playerPhrases[Math.floor(Math.random() * playerPhrases.length)];
            const randomPlayer = names[Math.floor(Math.random() * names.length)];
            return randomPhrase.replace("{PLAYER}", randomPlayer);
        } else {
            const genericPhrases = HOST_PHRASES[phaseKey];
            return genericPhrases[Math.floor(Math.random() * genericPhrases.length)];
        }
    };

    // Cambiar frase cuando cambia la fase o periódicamente
    useEffect(() => {
        const newPhrase = getRandomPhrase(phase, playerNames);
        setCurrentPhrase(newPhrase);
        setDisplayedText("");
        setIsTyping(true);
    }, [phase, showResults]);

    // Efecto de máquina de escribir
    useEffect(() => {
        if (!isTyping || !currentPhrase) return;

        let charIndex = 0;
        const typeInterval = setInterval(() => {
            if (charIndex < currentPhrase.length) {
                setDisplayedText(currentPhrase.slice(0, charIndex + 1));
                charIndex++;
            } else {
                setIsTyping(false);
                clearInterval(typeInterval);
            }
        }, 40);

        return () => clearInterval(typeInterval);
    }, [currentPhrase, isTyping]);

    // Cambiar frase cada 6 segundos en el lobby
    useEffect(() => {
        if (phase !== "LOBBY") return;

        const interval = setInterval(() => {
            const newPhrase = getRandomPhrase("LOBBY", playerNames);
            setCurrentPhrase(newPhrase);
            setDisplayedText("");
            setIsTyping(true);
        }, 6000);

        return () => clearInterval(interval);
    }, [phase, playerNames]);

    // Frase especial para ganador
    const displayPhrase = useMemo(() => {
        if (phase === "RESULTS" && winnerName && showResults) {
            return `¡${winnerName} arrasa con esa respuesta!`;
        }
        if (phase === "PODIUM" && winnerName) {
            return `¡Felicidades a ${winnerName}, el rey o reina del absurdo!`;
        }
        return displayedText;
    }, [phase, winnerName, showResults, displayedText]);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.8 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
                className="game-host-container"
            >
                {/* Altavoz Visual - "Que no hable" */}
                <motion.div
                    className="host-avatar-speaker"
                    animate={{
                        scale: isTyping ? [1, 1.1, 1] : 1,
                        rotate: isTyping ? [-5, 5, -5] : 0
                    }}
                    transition={{
                        duration: 0.5,
                        repeat: isTyping ? Infinity : 0
                    }}
                >
                    <div className="text-7xl filter drop-shadow-2xl" style={{ transform: "scaleX(-1)" }}>
                        📢
                    </div>
                </motion.div>

                {/* Burbuja de diálogo */}
                <motion.div
                    className="speech-bubble"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                >
                    <p className="speech-text">
                        {displayPhrase}
                        {isTyping && <span className="typing-cursor">|</span>}
                    </p>
                </motion.div>


                {matchInfo && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="host-info"
                    >
                        {matchInfo}
                    </motion.p>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

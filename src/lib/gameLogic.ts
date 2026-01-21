// Tipos del juego
export type GameStatus = 'LOBBY' | 'INPUT' | 'VOTING' | 'RESULTS' | 'PODIUM';

export interface Player {
    id: string;
    name: string;
    score: number;
    isHost: boolean;
    isSpectator?: boolean; // New: spectators join after game starts
    responses: { [promptIndex: number]: string };
    hasSubmitted: boolean;
    submittedRound: number; // Specifies which round the player has submitted for
    avatar: {
        characterId: string; // ID del personaje de frutas
        characterName: string; // Nombre del personaje
        imageUrl: string; // URL de la imagen del personaje
    };
}

export interface Match {
    promptText: string;
    promptIndex: number;
    playerA: string;
    playerB: string;
    responseA: string;
    responseB: string;
    votesA: string[];
    votesB: string[];
    revealed: boolean;
}

export interface GameState {
    status: GameStatus;
    currentRound: number;
    totalRounds: number;
    timer: number;
    currentMatchIndex: number;
    inputTimeLimit: number;
    voteTimeLimit: number;
}

export interface Room {
    id: string;
    createdAt: number;
    hostId: string;
    gameState: GameState;
    players: { [playerId: string]: Player };
    matches: Match[];
    prompts: string[];
    lastActive?: number;
}

// Palabras para generar room IDs memorables (todas de 4 letras)
export const ROOM_WORDS = [
    'BOLA', 'TACO', 'GATO', 'PATO', 'LUNA', 'MAGO', 'RAYO', 'PUMA',
    'NUBE', 'FLOR', 'ROCA', 'SOPA', 'MESA', 'VINO', 'CAFE', 'POLO',
    'RATA', 'COCO', 'FOCA', 'LEON', 'PERA', 'KIWI', 'LOBO', 'MONO',
    'BUHO', 'RANA', 'FARO', 'NAVE', 'DADO', 'DEDO', 'LAVA', 'COPA'
];

// Genera un ID de sala memorable
export function generateRoomId(): string {
    return ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)];
}

// Genera un ID único para jugador
export function generatePlayerId(): string {
    return Math.random().toString(36).substring(2, 15);
}

// Distribuir prompts entre jugadores (cada prompt a 2 jugadores diferentes)
export function distributePrompts(
    playerIds: string[],
    prompts: string[]
): Match[] {
    const matches: Match[] = [];
    const numPlayers = playerIds.length;

    // Cada jugador debe responder a 2 prompts
    // Necesitamos: numPlayers prompts (cada uno respondido por 2 personas)
    const promptCount = numPlayers;
    const selectedPrompts = prompts.slice(0, promptCount);

    // Crear pares de jugadores para cada prompt
    // Usamos un algoritmo Round-Robin modificado
    for (let i = 0; i < selectedPrompts.length; i++) {
        const playerA = playerIds[i % numPlayers];
        const playerB = playerIds[(i + 1) % numPlayers];

        matches.push({
            promptText: selectedPrompts[i],
            promptIndex: i,
            playerA,
            playerB,
            responseA: '',
            responseB: '',
            votesA: [],
            votesB: [],
            revealed: false
        });
    }

    return matches;
}

// Obtener prompts asignados a un jugador específico
export function getPlayerPrompts(
    playerId: string,
    matches: Match[]
): { promptIndex: number; promptText: string; isPlayerA: boolean }[] {
    const playerPrompts: { promptIndex: number; promptText: string; isPlayerA: boolean }[] = [];

    matches.forEach((match, index) => {
        if (match.playerA === playerId) {
            playerPrompts.push({
                promptIndex: index,
                promptText: match.promptText,
                isPlayerA: true
            });
        } else if (match.playerB === playerId) {
            playerPrompts.push({
                promptIndex: index,
                promptText: match.promptText,
                isPlayerA: false
            });
        }
    });

    return playerPrompts;
}

// Calcular puntuación
export function calculateScore(
    votesReceived: number,
    totalVoters: number,
    isLastRound: boolean
): { baseScore: number; quiplashBonus: number; multiplier: number; total: number } {
    const baseScore = votesReceived * 100;
    const isQuiplash = votesReceived === totalVoters && totalVoters > 1;
    const quiplashBonus = isQuiplash ? 500 : 0;
    const multiplier = isLastRound ? 2 : 1;

    return {
        baseScore,
        quiplashBonus,
        multiplier,
        total: (baseScore + quiplashBonus) * multiplier
    };
}

// Estado inicial de una partida
export function createInitialGameState(): GameState {
    return {
        status: 'LOBBY',
        currentRound: 1,
        totalRounds: 2,
        timer: 0,
        currentMatchIndex: 0,
        inputTimeLimit: 90,
        voteTimeLimit: 15
    };
}

// Personajes de frutas con personalidad para avatares (imágenes personalizadas)
export const AVATAR_CHARACTERS = [
    { id: 'banana-resbalon', name: 'Banana "Resbalón"', image: '/avatars/banana-resbalon.png' },
    { id: 'aguacate-el-fit', name: 'Aguacate "El Fit"', image: '/avatars/aguacate-el-fit.png' },
    { id: 'don-limon', name: 'Don Limón', image: '/avatars/don-limon.png' },
    { id: 'pina-punky', name: 'Piña Punky', image: '/avatars/pina-punky.png' },
    { id: 'coco-loco', name: 'Coco Loco', image: '/avatars/coco-loco.png' },
    { id: 'fresa-la-influencer', name: 'Fresa La Influencer', image: '/avatars/fresa-la-influencer.png' },
    { id: 'sandia-la-bomba', name: 'Sandía "La Bomba"', image: '/avatars/sandia-la-bomba.png' },
    { id: 'cereza-gemela', name: 'Cereza Gemela', image: '/avatars/cereza-gemela.png' },
    { id: 'pera-fecto', name: 'Pera-Fecto', image: '/avatars/pera-fecto.png' },
    { id: 'naranja-mecanica', name: 'Naranja Mecánica', image: '/avatars/naranja-mecanica.png' },
    { id: 'arandano-el-azul', name: 'Arándano "El Azul"', image: '/avatars/arandano-el-azul.png' },
    { id: 'granada-explosiva', name: 'Granada Explosiva', image: '/avatars/granada-explosiva.png' },
    { id: 'pitaya-mistica', name: 'Pitaya Mística', image: '/avatars/pitaya-mistica.png' },
    { id: 'higo-el-viejo', name: 'Higo El Viejo', image: '/avatars/higo-el-viejo.png' },
    { id: 'melocoton-terciopelo', name: 'Melocotón Terciopelo', image: '/avatars/melocoton-terciopelo.png' },
    { id: 'durian-el-pestes', name: 'Durian El Pestes', image: '/avatars/durian-el-pestes.png' },
    { id: 'paco-manzana', name: 'Paco Manzana', image: '/avatars/paco-manzana.png' },
    { id: 'uva-el-peque', name: 'Uva "El Peque"', image: '/avatars/uva-el-peque.png' },
    { id: 'kiko-kiwi', name: 'Kiko Kiwi', image: '/avatars/kiko-kiwi.png' },
    { id: 'china-mandarina', name: 'China Mandarina', image: '/avatars/china-mandarina.png' },
];

// Gradientes vibrantes para fondos
export const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #FF3333 0%, #990000 100%)', // Rojo
    'linear-gradient(135deg, #FF9933 0%, #CC6600 100%)', // Naranja
    'linear-gradient(135deg, #FFFF33 0%, #CCCC00 100%)', // Amarillo
    'linear-gradient(135deg, #33FF33 0%, #009900 100%)', // Verde
    'linear-gradient(135deg, #33FFFF 0%, #009999 100%)', // Turquesa
    'linear-gradient(135deg, #3333FF 0%, #000099 100%)', // Azul
    'linear-gradient(135deg, #CC33FF 0%, #660099 100%)', // Morado
    'linear-gradient(135deg, #FF33FF 0%, #990099 100%)', // Rosa
    'linear-gradient(135deg, #996633 0%, #663300 100%)', // Marrón
    'linear-gradient(135deg, #666666 0%, #333333 100%)'  // Gris
];

// Definición de accesorios vectoriales (SVG) para una estética premium
export const AVATAR_ACCESSORIES = [
    { id: 'none', name: 'Ninguno', icon: '❌' },
    {
        id: 'mustache_classic',
        name: 'Bigote Clásico',
        path: 'M -10,2 Q -10,-2 -2,-2 L 0,-1 L 2,-2 Q 10,-2 10,2 Q 10,5 5,5 L 0,2 L -5,5 Q -10,5 -10,2',
        color: '#333'
    },
    {
        id: 'mustache_fancy',
        name: 'Bigote Dalí',
        path: 'M -12,0 C -12,-8 0,-8 0,-2 C 0,-8 12,-8 12,0 C 12,2 8,2 6,1 C 4,0 2,0 0,0 C -2,0 -4,0 -6,1 C -8,2 -12,2 -12,0',
        color: '#1a1a1a',
        scale: 1.2
    },
    {
        id: 'glasses_round',
        name: 'Gafas Intelectual',
        path: 'M -8,-2 A 4,4 0 1,1 -8,6 A 4,4 0 1,1 -8,-2 M 8,-2 A 4,4 0 1,1 8,6 A 4,4 0 1,1 8,-2 M -4,2 L 4,2',
        color: '#222',
        stroke: true
    },
    {
        id: 'glasses_cool',
        name: 'Gafas de Sol',
        path: 'M -10,-2 L 10,-2 L 10,3 Q 10,6 7,6 L 3,6 Q 0,6 0,3 Q 0,6 -3,6 L -7,6 Q -10,6 -10,3 Z',
        color: '#000'
    },
    {
        id: 'hat_top',
        name: 'Chistera',
        path: 'M -10,0 L 10,0 L 8,-2 L 8,-12 L -8,-12 L -8,-2 Z M -12,0 L 12,0 L 12,2 L -12,2 Z',
        color: '#111',
        offsetY: -15
    },
    {
        id: 'hat_crown',
        name: 'Corona',
        path: 'M -10,0 L 10,0 L 12,-10 L 6,-5 L 0,-12 L -6,-5 L -12,-10 Z',
        color: '#FFD700',
        offsetY: -12
    },
    {
        id: 'hat_detective',
        name: 'Sombrero Detective',
        path: 'M -12,0 L 12,0 L 10,-4 L 10,-8 Q 10,-12 0,-12 Q -10,-12 -10,-8 L -10,-4 Z M -15,0 L 15,0 L 15,2 L -15,2 Z',
        color: '#4a3728',
        offsetY: -10
    },
    {
        id: 'bow_tie',
        name: 'Pajarita',
        path: 'M 0,0 L 8,5 L 8,-5 Z M 0,0 L -8,5 L -8,-5 Z M -2,0 A 2,2 0 1,1 2,0 A 2,2 0 1,1 -2,0',
        color: '#cc0000',
        offsetY: 18
    },
    {
        id: 'monocle',
        name: 'Monóculo',
        path: 'M 4,-2 A 4,4 0 1,1 4,6 A 4,4 0 1,1 4,-2 M 8,2 L 12,8',
        color: '#FFD700',
        stroke: true,
        scale: 0.8
    }
];

// Generar avatar aleatorio (selecciona un personaje de frutas al azar)
export function generateAvatar() {
    const character = AVATAR_CHARACTERS[Math.floor(Math.random() * AVATAR_CHARACTERS.length)];
    return {
        characterId: character.id,
        characterName: character.name,
        imageUrl: character.image
    };
}

// Crear jugador nuevo (con avatar opcional personalizado)
export function createPlayer(
    id: string,
    name: string,
    isHost: boolean = false,
    customAvatar?: { characterId: string; characterName: string; imageUrl: string },
    isSpectator: boolean = false
): Player {
    return {
        id,
        name,
        score: 0,
        isHost,
        isSpectator,
        responses: {},
        hasSubmitted: false,
        submittedRound: 0,
        avatar: customAvatar || generateAvatar()
    };
}


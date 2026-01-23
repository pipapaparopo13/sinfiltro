// Tipos para los modos de juego y mejoras de jugabilidad

export type GameMode = 'classic' | 'quick' | 'epic' | 'spicy' | 'family';
export type PromptCategory = 'all' | 'food' | 'love' | 'work' | 'absurd' | 'spicy' | 'pop-culture';
export type PowerUpType = 'double-or-nothing' | 'steal-vote' | 'extra-time' | 'wildcard';

export interface GameModeConfig {
    id: GameMode;
    name: string;
    description: string;
    emoji: string;
    rounds: number;
    timeLimit: number; // segundos para escribir
    voteTimeLimit: number; // segundos para votar
    pointMultiplier: number;
}

export interface PowerUp {
    id: PowerUpType;
    name: string;
    description: string;
    emoji: string;
    cost: number; // puntos que cuesta
    usageCondition?: string;
}

export interface PlayerStreak {
    currentWins: number;
    currentLosses: number;
    longestWinStreak: number;
}

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
    classic: {
        id: 'classic',
        name: 'Clásico',
        description: '2 rondas, tiempo estándar. El modo original.',
        emoji: '🎮',
        rounds: 2,
        timeLimit: 90,
        voteTimeLimit: 20,
        pointMultiplier: 1
    },
    quick: {
        id: 'quick',
        name: 'Modo Rápido',
        description: '1 ronda, 60 segundos. ¡Rápido y furioso!',
        emoji: '⚡',
        rounds: 1,
        timeLimit: 60,
        voteTimeLimit: 15,
        pointMultiplier: 1.2
    },
    epic: {
        id: 'epic',
        name: 'Modo Épico',
        description: '5 rondas. La batalla definitiva.',
        emoji: '👑',
        rounds: 5,
        timeLimit: 90,
        voteTimeLimit: 20,
        pointMultiplier: 1
    },
    spicy: {
        id: 'spicy',
        name: 'Modo Picante',
        description: 'Solo preguntas atrevidas. +18',
        emoji: '🌶️',
        rounds: 2,
        timeLimit: 90,
        voteTimeLimit: 20,
        pointMultiplier: 1.5
    },
    family: {
        id: 'family',
        name: 'Modo Familiar',
        description: 'Preguntas aptas para toda la familia.',
        emoji: '👨‍👩‍👧‍👦',
        rounds: 2,
        timeLimit: 120, // Más tiempo para los pequeños
        voteTimeLimit: 25,
        pointMultiplier: 1
    }
};

export const POWER_UPS: Record<PowerUpType, PowerUp> = {
    'double-or-nothing': {
        id: 'double-or-nothing',
        name: 'Doble o Nada',
        description: 'Duplica los puntos que ganes o pierde el doble',
        emoji: '🎲',
        cost: 50,
        usageCondition: 'Antes de enviar tus respuestas'
    },
    'steal-vote': {
        id: 'steal-vote',
        name: 'Robar Voto',
        description: 'Roba un voto del oponente si pierdes',
        emoji: '🦹',
        cost: 100,
        usageCondition: 'Después de ver los resultados'
    },
    'extra-time': {
        id: 'extra-time',
        name: 'Tiempo Extra',
        description: 'Añade 30 segundos para escribir',
        emoji: '⏰',
        cost: 30,
        usageCondition: 'Durante la fase de escritura'
    },
    'wildcard': {
        id: 'wildcard',
        name: 'Comodín',
        description: 'Cambia tu pregunta por otra nueva',
        emoji: '🃏',
        cost: 75,
        usageCondition: 'Al inicio de la ronda'
    }
};

export const PROMPT_CATEGORIES = {
    all: { name: 'Todas', emoji: '🎯' },
    food: { name: 'Comida', emoji: '🍕' },
    love: { name: 'Amor y Citas', emoji: '💕' },
    work: { name: 'Trabajo', emoji: '💼' },
    absurd: { name: 'Absurdo', emoji: '🤪' },
    spicy: { name: 'Picante (+18)', emoji: '🌶️' },
    'pop-culture': { name: 'Cultura Pop', emoji: '🎬' }
};

// Streak bonuses
export const STREAK_BONUSES = {
    3: { multiplier: 1.5, name: '¡En Racha!', emoji: '🔥' },
    5: { multiplier: 2, name: '¡Imparable!', emoji: '⚡' },
    7: { multiplier: 2.5, name: '¡Legendario!', emoji: '👑' }
};

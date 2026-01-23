"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SoundType =
    | "join"
    | "start"
    | "tick"
    | "submit"
    | "reveal"
    | "vote"
    | "winner"
    | "podium"
    | "countdown"
    | "whoosh"
    | "fail";

type MusicType = "lobby" | "gameplay" | "voting" | "results";

export function useGameAudio() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const musicOscillatorsRef = useRef<OscillatorNode[]>([]);
    const [isMuted, setIsMuted] = useState(true); // Start muted by default
    const [volume, setVolume] = useState(0.3);
    const currentMusicRef = useRef<MusicType | null>(null);

    // Initialize AudioContext on first interaction
    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.connect(audioContextRef.current.destination);
            gainNodeRef.current.gain.value = isMuted ? 0 : volume;
        }
        if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume();
        }
    }, [isMuted, volume]);

    // Update volume when changed
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = isMuted ? 0 : volume;
        }
        // Also update MP3 volume if playing
        if (currentAudioRef.current) {
            currentAudioRef.current.volume = isMuted ? 0 : (volume * 0.5);
        }
    }, [isMuted, volume]);

    // Play a synthesized sound effect
    const playSound = useCallback((type: SoundType) => {
        initAudio();
        if (!audioContextRef.current || !gainNodeRef.current) return;

        const ctx = audioContextRef.current;
        const now = ctx.currentTime;

        // Create temporary gain for this sound
        const soundGain = ctx.createGain();
        soundGain.connect(gainNodeRef.current);

        switch (type) {
            case "join": {
                // Pleasant ascending chime
                const osc = ctx.createOscillator();
                osc.type = "sine";
                osc.frequency.setValueAtTime(523, now); // C5
                osc.frequency.setValueAtTime(659, now + 0.1); // E5
                osc.frequency.setValueAtTime(784, now + 0.2); // G5
                soundGain.gain.setValueAtTime(0.3, now);
                soundGain.gain.linearRampToValueAtTime(0.01, now + 0.4);
                osc.connect(soundGain);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            }
            case "start": {
                // Exciting fanfare-like sound
                [523, 659, 784, 1047].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = "square";
                    osc.frequency.value = freq;
                    const env = ctx.createGain();
                    env.gain.setValueAtTime(0, now + i * 0.1);
                    env.gain.linearRampToValueAtTime(0.2, now + i * 0.1 + 0.05);
                    env.gain.linearRampToValueAtTime(0.1, now + i * 0.1 + 0.3);
                    env.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.5);
                    osc.connect(env);
                    env.connect(soundGain);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.5);
                });
                break;
            }
            case "tick": {
                // Quick tick sound
                const osc = ctx.createOscillator();
                osc.type = "sine";
                osc.frequency.value = 880;
                soundGain.gain.setValueAtTime(0.15, now);
                soundGain.gain.linearRampToValueAtTime(0, now + 0.05);
                osc.connect(soundGain);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            }
            case "submit": {
                // Confirmation sound
                const osc = ctx.createOscillator();
                osc.type = "sine";
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(880, now + 0.1);
                soundGain.gain.setValueAtTime(0.2, now);
                soundGain.gain.linearRampToValueAtTime(0, now + 0.2);
                osc.connect(soundGain);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            }
            case "reveal": {
                // Dramatic reveal sound
                const osc = ctx.createOscillator();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                soundGain.gain.setValueAtTime(0.15, now);
                soundGain.gain.linearRampToValueAtTime(0, now + 0.4);
                osc.connect(soundGain);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            }
            case "vote": {
                // Quick pop sound
                const osc = ctx.createOscillator();
                osc.type = "sine";
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
                soundGain.gain.setValueAtTime(0.2, now);
                soundGain.gain.linearRampToValueAtTime(0, now + 0.15);
                osc.connect(soundGain);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            }
            case "winner": {
                // Victory fanfare
                const notes = [523, 659, 784, 1047, 784, 1047];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = "triangle";
                    osc.frequency.value = freq;
                    const env = ctx.createGain();
                    env.gain.setValueAtTime(0, now + i * 0.15);
                    env.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.05);
                    env.gain.linearRampToValueAtTime(0.15, now + i * 0.15 + 0.1);
                    env.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.3);
                    osc.connect(env);
                    env.connect(soundGain);
                    osc.start(now + i * 0.15);
                    osc.stop(now + i * 0.15 + 0.3);
                });
                break;
            }
            case "podium": {
                // Grand celebration sound
                const chords = [
                    [523, 659, 784], // C major
                    [587, 740, 880], // D major
                    [659, 830, 988], // E major
                    [698, 880, 1047], // F major
                ];
                chords.forEach((chord, i) => {
                    chord.forEach((freq) => {
                        const osc = ctx.createOscillator();
                        osc.type = "triangle";
                        osc.frequency.value = freq;
                        const env = ctx.createGain();
                        env.gain.setValueAtTime(0, now + i * 0.4);
                        env.gain.linearRampToValueAtTime(0.1, now + i * 0.4 + 0.1);
                        env.gain.linearRampToValueAtTime(0.05, now + i * 0.4 + 0.3);
                        env.gain.linearRampToValueAtTime(0, now + i * 0.4 + 0.5);
                        osc.connect(env);
                        env.connect(soundGain);
                        osc.start(now + i * 0.4);
                        osc.stop(now + i * 0.4 + 0.5);
                    });
                });
                break;
            }
            case "countdown": {
                // Tension building countdown
                const osc = ctx.createOscillator();
                osc.type = "square";
                osc.frequency.value = 440;
                soundGain.gain.setValueAtTime(0.1, now);
                soundGain.gain.linearRampToValueAtTime(0, now + 0.1);
                osc.connect(soundGain);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            }
            case "whoosh": {
                // Transition whoosh
                const osc = ctx.createOscillator();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                soundGain.gain.setValueAtTime(0.1, now);
                soundGain.gain.linearRampToValueAtTime(0, now + 0.4);
                osc.connect(soundGain);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            }
            case "fail": {
                // Sad trombone / fail sound
                const osc = ctx.createOscillator();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.5);

                // Add some vibrato for comedic effect
                const lfo = ctx.createOscillator();
                lfo.frequency.value = 5;
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = 10;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start(now);
                lfo.stop(now + 0.5);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);

                osc.connect(gain);
                gain.connect(gainNodeRef.current!);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
            }
        }
    }, [initAudio]);

    // Reference for current HTML5 audio element
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Play fun background music (MP3 or chiptune fallback)
    const playMusic = useCallback((type: MusicType) => {
        initAudio();
        // Stop current music if playing
        stopMusic();

        currentMusicRef.current = type;

        // Define MP3 mapping
        const mp3Files: Record<string, string> = {
            'lobby': '/sounds/game1.mp3',
            'gameplay': '/sounds/game2.mp3',
            // Default to game2 for others if needed, or fallback to synth
        };

        const mp3Src = mp3Files[type];

        if (mp3Src) {
            // Play MP3 file
            const audio = new Audio(mp3Src);
            audio.loop = true;
            audio.volume = isMuted ? 0 : (volume * 0.5); // Slightly lower volume for BG music
            audio.play().catch(err => console.log("Audio play failed (maybe needs interaction):", err));
            currentAudioRef.current = audio;
            return;
        }

        // --- FALLBACK TO SYNTH (for types without MP3 or error) ---
        if (!audioContextRef.current || !gainNodeRef.current) return;

        const ctx = audioContextRef.current;

        // Fun, cheerful melody patterns (notes in Hz)
        const melodies: Record<MusicType, number[]> = {
            lobby: [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 523], // Happy C major
            gameplay: [784, 880, 988, 880, 784, 988, 1175, 988, 784, 659, 784, 880, 988, 1175, 1318, 1175], // Bright, bouncy happy tune
            voting: [392, 440, 523, 440, 392, 349, 392, 440, 523, 659, 523, 440], // Suspenseful but fun
            results: [784, 880, 988, 1047, 988, 880, 784, 880, 988, 1047, 1175, 1047], // Victory feel
        };

        const melody = melodies[type] || melodies.lobby;
        const noteDuration = type === "lobby" ? 0.25 : type === "gameplay" ? 0.18 : 0.2; // Faster for gameplay
        const totalDuration = melody.length * noteDuration;

        let noteIndex = 0;
        const playNote = () => {
            if (!audioContextRef.current || !gainNodeRef.current) return;
            if (currentMusicRef.current !== type) return; // Stop if music changed

            const now = ctx.currentTime;
            const freq = melody[noteIndex % melody.length];

            // Main melody oscillator (square wave for chiptune feel)
            const osc = ctx.createOscillator();
            osc.type = "square";
            osc.frequency.value = freq;

            // Envelope for each note
            const noteGain = ctx.createGain();
            noteGain.gain.setValueAtTime(0, now);
            noteGain.gain.linearRampToValueAtTime(0.08, now + 0.02);
            noteGain.gain.linearRampToValueAtTime(0.05, now + noteDuration * 0.5);
            noteGain.gain.linearRampToValueAtTime(0, now + noteDuration * 0.9);

            osc.connect(noteGain);
            noteGain.connect(gainNodeRef.current!);

            osc.start(now);
            osc.stop(now + noteDuration);

            // Bass note (every 4 notes)
            if (noteIndex % 4 === 0) {
                const bassOsc = ctx.createOscillator();
                bassOsc.type = "triangle";
                bassOsc.frequency.value = freq / 4; // Two octaves down

                const bassGain = ctx.createGain();
                bassGain.gain.setValueAtTime(0.06, now);
                bassGain.gain.linearRampToValueAtTime(0, now + noteDuration * 2);

                bassOsc.connect(bassGain);
                bassGain.connect(gainNodeRef.current!);

                bassOsc.start(now);
                bassOsc.stop(now + noteDuration * 2);
            }

            noteIndex++;
        };

        // Start the melody loop
        playNote();
        const intervalId = setInterval(() => {
            if (currentMusicRef.current !== type) {
                clearInterval(intervalId);
                return;
            }
            playNote();
        }, noteDuration * 1000);

        // Store interval for cleanup
        (musicOscillatorsRef as any).intervalId = intervalId;
    }, [initAudio, isMuted, volume]); // Added dependencies

    // Stop background music
    const stopMusic = useCallback(() => {
        // Stop MP3 if playing
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }

        // Clear the interval if exists (synth)
        if ((musicOscillatorsRef as any).intervalId) {
            clearInterval((musicOscillatorsRef as any).intervalId);
            (musicOscillatorsRef as any).intervalId = null;
        }
        musicOscillatorsRef.current.forEach((osc) => {
            try {
                osc.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        });
        musicOscillatorsRef.current = [];
        currentMusicRef.current = null;
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        initAudio();
        setIsMuted((prev) => !prev);
    }, [initAudio]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMusic();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stopMusic]);

    return {
        playSound,
        playMusic,
        stopMusic,
        toggleMute,
        setVolume,
        isMuted,
        volume,
        initAudio,
    };
}

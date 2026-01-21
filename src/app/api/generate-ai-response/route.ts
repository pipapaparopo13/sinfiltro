import { HfInference } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

// Fallback responses when AI fails - creative and funny
const FALLBACK_RESPONSES = [
    "Mi cerebro ha explotado... literalmente",
    "Error 404: Creatividad no encontrada",
    "La IA se ha ido a tomar un café",
    "Ups, el hámster que genera mis ideas se durmió",
    "¿Y si simplemente fingimos que esto no pasó?",
    "Mi respuesta era tan buena que el servidor la rechazó",
    "La inspiración está de vacaciones",
    "Un unicornio me robó la respuesta",
    "Técnicamente, esto es arte moderno",
    "Mi abuela responde mejor que yo",
    "Se me olvidó pensar, perdón",
    "El WiFi se comió mi respuesta",
    "Esto es muy profundo para mí",
    "Mi perro escribiría algo mejor",
];

function getRandomFallback(): string {
    return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

export async function POST(request: NextRequest) {
    try {
        const { promptText } = await request.json();

        if (!promptText || typeof promptText !== "string") {
            return NextResponse.json(
                { error: "Se requiere un promptText", fallback: getRandomFallback() },
                { status: 400 }
            );
        }

        // Enhanced system prompt for funnier responses
        const systemPrompt = `Eres un genio del humor absurdo participando en un juego tipo Quiplash. Tu misión: responder de forma SUPER graciosa, inesperada y breve (máximo 8 palabras) en ESPAÑOL.

Pregunta: "${promptText}"

REGLAS:
- Sé absurdo, surrealista o sarcástico
- Respuestas cortas y contundentes
- Nada de explicaciones, solo la respuesta
- Sorprende con algo inesperado
- Humor inteligente o referencia cultural = bonus

SOLO escribe la respuesta, nada más.`;

        const response = await hf.textGeneration({
            model: "mistralai/Mistral-7B-Instruct-v0.2",
            inputs: `<s>[INST] ${systemPrompt} [/INST]`,
            parameters: {
                max_new_tokens: 25,
                temperature: 1.0,
                top_p: 0.92,
                repetition_penalty: 1.3,
            },
        });

        let aiResponse = response.generated_text.split("[/INST]").pop()?.trim() || getRandomFallback();

        // Clean up the response
        aiResponse = aiResponse
            .replace(/[\"'«»]/g, "")
            .replace(/^\s*-\s*/, "")
            .replace(/\n.*/g, "")
            .trim();

        // If response is too long or empty, use fallback
        if (!aiResponse || aiResponse.length < 2) {
            aiResponse = getRandomFallback();
        }
        if (aiResponse.length > 80) {
            aiResponse = aiResponse.substring(0, 77) + "...";
        }

        return NextResponse.json({
            success: true,
            response: aiResponse,
        });

    } catch (error: unknown) {
        console.error("Error generating AI response:", error);

        // Use creative fallback instead of generic error
        return NextResponse.json({
            success: true,
            response: getRandomFallback(),
        });
    }
}


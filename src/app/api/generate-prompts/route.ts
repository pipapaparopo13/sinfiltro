
import { HfInference } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

export async function POST(request: NextRequest) {
    try {
        const { topic } = await request.json();

        // 1. CLEAN TOPIC (Crucial for user experience)
        // Removes "Sobre...", "Frases de..." to get the core subject.
        let cleanTopic = topic.trim();
        const prefixes = ["sobre ", "acerca de ", "frases de ", "chistes de ", "preguntas de ", "temas de "];

        // Loop to ensuring we catch "sobre frases de..." cases if needed, though simple loop is usually enough
        let changed = true;
        while (changed) {
            changed = false;
            for (const prefix of prefixes) {
                if (cleanTopic.toLowerCase().startsWith(prefix)) {
                    cleanTopic = cleanTopic.substring(prefix.length).trim();
                    changed = true;
                }
            }
        }

        console.log(`🧹 Cleaned topic: "${topic}" -> "${cleanTopic}"`);

        if (!cleanTopic) cleanTopic = topic; // Fallback if cleaning removed everything


        // 2. PROMPT BASADO EN QUIPLASH ORIGINAL (399 EJEMPLOS REALES)
        const prompt = `
Eres un escritor de comedia para el juego "Quiplash" de Jackbox Games.

TEMA SOLICITADO: "${cleanTopic}"

IMPORTANTE: Genera 5 preguntas de humor sobre este tema siguiendo EXACTAMENTE el estilo del juego original Quiplash.

FORMATOS DEL JUEGO ORIGINAL (ejemplos reales):

1. PREGUNTAS ABIERTAS (sin espacios):
   - "La verdadera razón por la que murieron los dinosaurios"
   - "Lo primero que harías tras ganar la lotería"
   - "El crimen que cometerías si pudieras salirte con la tuya"
   - "Algo que las ardillas probablemente hacen cuando nadie las mira"

2. COMPLETAR CON ____ (espacios en blanco):
   - "Nunca te subirías a una montaña rusa llamada ____"
   - "Sabes que vas en un mal taxi cuando ____"
   - "El espectáculo del descanso de la Super Bowl sería mejor con ____"
   - "Si Dios tiene sentido del humor, recibe a la gente en el cielo diciendo ____"

3. INVENTA UN NOMBRE:
   - "Un nombre terrible para un crucero"
   - "Inventa un nombre para una cerveza hecha especialmente para monos"
   - "El nombre de una pizzería a la que nunca deberías pedir nada"
   - "Un buen nombre artístico para un chimpancé stripper"

4. EL PEOR/MEJOR:
   - "La peor forma de ser asesinado"
   - "Lo mejor de ir a la cárcel"
   - "El peor nombre para un campamento de verano"
   - "La mejor manera de mantenerse caliente en una noche fría"

5. ALGO QUE...:
   - "Algo que no deberías llevar a una entrevista de trabajo"
   - "Algo peligroso que hacer mientras conduces"
   - "Algo que nunca deberías usar como bufanda"
   - "Algo con lo que te gustaría llenar una piscina"

REGLAS CRÍTICAS:
1. USA ____ para espacios en blanco (NO "ESPACIO EN BLANCO")
2. Humor absurdo, provocador, a veces adulto
3. Sé ESPECÍFICO sobre ${cleanTopic} - no genérico
4. Máximo 20 palabras por pregunta
5. Permite respuestas creativas y variadas

EJEMPLOS CONTEXTUALES SOBRE "${cleanTopic}":

Si fuera "Cristiano Ronaldo":
- "El producto más vergonzoso que ha promocionado CR7"
- "Lo que Cristiano realmente hace con sus trofeos del Balón de Oro"
- "Un nombre terrible para un documental sobre Ronaldo"
- "Lo peor que podría pasarle a Cristiano en un partido"
- "El secreto de los abdominales de CR7 que los médicos odian"

Si fuera "Pizza":
- "El peor ingrediente para pizza jamás inventado"  
- "Algo que nunca deberías usar como masa de pizza"
- "El nombre de una pizzería que cerraría en una semana"
- "Lo que realmente hay en la pizza de pepperoni"
- "Una pizza tan mala que sería un crimen ____"

Si fuera "Ikea":
- "El mueble de IKEA con el nombre más impronunciable"
- "Lo que realmente pasa en la sección de almacenaje de IKEA"
- "El peor trabajo en IKEA sería ____"
- "Una buena razón para perderte en IKEA a propósito"
- "Lo que encuentras si buscas IKEA en la Deep Web"

AHORA GENERA 5 PREGUNTAS SOBRE "${cleanTopic}" EN ESPAÑOL:
(Usa estos formatos: 2-3 abiertas, 1-2 con ____, varía los estilos)
`;

        let text = "";

        // Intentar con modelos más potentes y mejor configurados
        const models = [
            "mistralai/Mistral-7B-Instruct-v0.2",  // Versión mejorada
            "meta-llama/Llama-2-7b-chat-hf",       // Llama 2 es muy bueno para español
            "google/gemma-1.1-7b-it",
        ];

        let lastError = null;

        for (const model of models) {
            try {
                console.log(`🤖 Intentando generar con ${model}...`);
                const response = await hf.textGeneration({
                    model: model,
                    inputs: prompt,  // Sin [INST] ya que el prompt ya lo tiene estructurado
                    parameters: {
                        max_new_tokens: 500,  // Más tokens para respuestas completas
                        temperature: 0.9,  // Más creatividad
                        top_p: 0.95,
                        repetition_penalty: 1.2,  // Evita repeticiones
                        return_full_text: false,
                        do_sample: true,
                        // @ts-ignore
                        wait_for_model: true
                    },
                });

                console.log(`📝 Respuesta recibida (${response.generated_text?.length || 0} caracteres)`);

                if (response.generated_text && response.generated_text.length > 30) {
                    text = response.generated_text;
                    console.log(`✅ Éxito con ${model}!`);
                    console.log(`Texto generado: ${text.substring(0, 200)}...`);
                    break;
                } else {
                    console.warn(`⚠️ ${model} generó texto muy corto o vacío`);
                }
            } catch (err: any) {
                console.error(`❌ Error con ${model}:`, err.message);
                lastError = err;
            }
        }

        if (!text) {
            console.error("⚠️⚠️⚠️ TODOS LOS MODELOS FALLARON - Usando templates de fallback");
            console.error("Último error:", lastError);
        }

        // 3. FALLBACK INTELIGENTE CON ANÁLISIS BÁSICO
        // Estos templates intentan ser más contextuales y específicos
        if (!text) {
            console.error("❌ All models failed. Using Smart Fallback Templates.");

            // Templates más inteligentes que consideran el contexto
            const smartTemplates = [
                // Secretos y revelaciones
                `Lo que no te cuentan sobre ${cleanTopic}`,
                `El secreto mejor guardado de ${cleanTopic}`,
                `La verdad incómoda sobre ${cleanTopic}`,

                // Versiones alternativas
                `La versión de ${cleanTopic} que fue prohibida`,
                `La versión premium de ${cleanTopic} que cuesta 10.000€`,
                `${cleanTopic} edición limitada incluye: _____`,

                // Titulares
                `El titular más absurdo sobre ${cleanTopic}`,
                `Última hora: ${cleanTopic} hace algo impensable`,
                `La noticia sobre ${cleanTopic} que censuraron`,

                // Productos
                `El merchandising de ${cleanTopic} que nadie pidió`,
                `El producto inspirado en ${cleanTopic} más ridículo`,
                `La colaboración entre ${cleanTopic} y _____`,

                // Cultura
                `La teoría conspirativa sobre ${cleanTopic}`,
                `Por qué ${cleanTopic} es tendencia en Twitter`,
                `El meme de ${cleanTopic} que se volvió viral`,

                // Comparaciones
                `${cleanTopic} vs _____: ¿quién ganaría?`,
                `La diferencia entre ${cleanTopic} normal y premium`,

                // Media
                `El documental prohibido sobre ${cleanTopic}`,
                `El episodio de ${cleanTopic} que Netflix censuró`,
                `El libro de ${cleanTopic} que fue prohibido`,

                // Datos falsos
                `El 99% de la gente no sabe esto de ${cleanTopic}`,
                `Científicos descubren algo terrible sobre ${cleanTopic}`,

                // Rankings
                `El peor momento para hablar de ${cleanTopic}`,
                `La forma más estúpida de usar ${cleanTopic}`,
                `El mayor error con ${cleanTopic}`,

                // Advertencias
                `La advertencia sobre ${cleanTopic} que nadie lee`,
                `Por qué evitar ${cleanTopic} los domingos`,

                // Behind the scenes
                `Lo que pasa detrás de cámaras en ${cleanTopic}`,
                `El ritual secreto de ${cleanTopic}`,
                `La parte de ${cleanTopic} que no sale en Instagram`,
            ];

            // Seleccionar 5 templates aleatorios
            const shuffled = smartTemplates.sort(() => 0.5 - Math.random());
            text = shuffled.slice(0, 5).join('\n');
        }


        // Clean up output
        const questions = text
            .split('\n')
            .map(line => line.trim())
            .filter(line =>
                line.length > 10 &&
                !line.includes("[INST]") &&
                !line.toLowerCase().includes("tema:") // Filter out echoes
            )
            .map(line => line.replace(/^\d+[\.|-|\)]\s*/, '').replace(/^- \s*/, '').replace(/^"|"$/g, ''))
            .slice(0, 5);

        return NextResponse.json({
            success: true,
            prompts: questions,
        });

    } catch (error: any) {
        console.error("❌ Fatal Error:", error);
        return NextResponse.json({ error: "Error fatal del servidor" }, { status: 500 });
    }
}

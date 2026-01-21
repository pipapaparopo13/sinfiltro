import { HfInference } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "Se requiere un prompt" },
                { status: 400 }
            );
        }

        // Create a prompt optimized for avatar generation
        const avatarPrompt = `cute cartoon avatar icon of a ${prompt}, simple colorful design, circular profile picture style, friendly expression, vibrant colors, game character, white background`;

        // Use Stable Diffusion XL for high quality images
        const response = await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: avatarPrompt,
            parameters: {
                num_inference_steps: 25,
                guidance_scale: 7.5,
            },
        });

        // Convert blob to base64 - response is a Blob
        const blob = response as unknown as Blob;
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = blob.type || "image/png";

        return NextResponse.json({
            success: true,
            image: `data:${mimeType};base64,${base64}`,
        });

    } catch (error: any) {
        console.error("Error generating avatar:", error);

        // Handle specific errors
        if (error.message?.includes("rate limit")) {
            return NextResponse.json(
                { error: "Demasiadas solicitudes. Espera un momento." },
                { status: 429 }
            );
        }

        if (error.message?.includes("loading")) {
            return NextResponse.json(
                { error: "El modelo está cargando. Intenta en 20 segundos." },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: "Error al generar el avatar. Inténtalo de nuevo." },
            { status: 500 }
        );
    }
}

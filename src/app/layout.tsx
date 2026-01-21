import type { Metadata } from "next";
import { Permanent_Marker, Luckiest_Guy, Bangers, Pangolin } from "next/font/google";
import "./globals.css";

const permanentMarker = Permanent_Marker({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-permanent-marker",
});

const luckiestGuy = Luckiest_Guy({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-luckiest-guy",
});

const bangers = Bangers({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-bangers",
});

const pangolin = Pangolin({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-pangolin",
});

export const metadata: Metadata = {
    title: "SINFILTRO - Juego de Fiesta",
    description: "El juego de fiesta donde la respuesta más graciosa gana",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={`${pangolin.variable} ${bangers.variable} ${permanentMarker.variable} ${luckiestGuy.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
}

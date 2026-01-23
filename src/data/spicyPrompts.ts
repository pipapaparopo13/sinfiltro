// Prompts PICANTES (+18) para el modo Spicy de SINFILTRO
// Contenido para adultos - solo para mayores de 18 años

export const SPICY_PROMPTS = [
    // Situaciones incómodas
    "Lo peor que podrías decir en pleno acto sexual",
    "Un mensaje de texto que enviarías a tu ex a las 3 de la mañana borracho/a",
    "Lo que realmente piensan tus vecinos cuando escuchan ruidos raros de tu habitación",
    "La excusa más creativa para salir de una cita que va fatal",
    "Lo primero que harías si encontraras el historial de búsquedas de tu pareja",
    "Un nombre para una película porno protagonizada por políticos españoles",
    "La frase que menos querrías escuchar de tu suegra en la cena de Navidad",
    "El peor lugar para que te pille tu madre haciendo 'cosas'",
    "Un tatuaje íntimo que nunca deberías hacerte",
    "Lo más vergonzoso que has hecho por ligar",

    // Frases de ligue fallidas
    "La peor frase para ligar en un funeral",
    "Un piropo que te garantiza una bofetada",
    "La frase que usarías para ligar en una reunión de Alcohólicos Anónimos",
    "Un mensaje de Tinder que te asegura el block inmediato",
    "La frase que menos quieres oír en la primera cita",
    "Un pick-up line para usar en la cola del paro",
    "La frase de ligue de alguien que lleva 10 años sin salir de casa",
    "Lo que NO debes decir cuando conoces a los padres de tu pareja",
    "Una bio de Tinder que grita 'red flag'",
    "El halago más inquietante que podrías hacer",

    // Secretos y confesiones
    "Algo que nunca le contarías a tu psicólogo",
    "El secreto más oscuro de tu grupo de WhatsApp familiar",
    "Lo que realmente haces cuando dices que 'estás trabajando desde casa'",
    "Una confesión que arruinaría cualquier cena familiar",
    "El pensamiento intrusivo más raro que has tenido en misa",
    "Algo por lo que deberías ir al infierno pero no te arrepientes",
    "Lo que NUNCA admitirías haber buscado en Google",
    "El fetiche más raro que inventarías si tuvieras que tener uno",
    "Algo que hiciste en la universidad que tus padres NUNCA pueden saber",
    "La mentira más grande que has dicho para salir de una situación incómoda",

    // Trabajo y vida adulta
    "Lo que realmente quieres decirle a tu jefe pero nunca dirás",
    "Un email de renuncia épico que te gustaría enviar",
    "Lo que piensas cuando tu compañero de trabajo no para de hablar",
    "Una razón por la que llamarías 'enfermo' al trabajo (que no puedes decir)",
    "El nombre de un curso de LinkedIn que nadie necesita",
    "Lo más inapropiado que has pensado en una reunión de trabajo",
    "Una excusa para no ir a la despedida de soltero/a de un compañero",
    "El motivo real por el que vas al baño 5 veces al día en el trabajo",
    "Lo que harías si te quedases encerrado en el ascensor con tu crush del trabajo",
    "Un mensaje de 'fuera de oficina' honesto",

    // Relaciones y drama
    "La señal más clara de que tu relación está muerta",
    "Lo peor que podrías encontrar en el móvil de tu pareja",
    "Una razón para cortar con alguien que es totalmente válida pero suena fatal",
    "El insulto más creativo para un ex",
    "Algo que nunca deberías hacer en la primera cita (pero mucha gente hace)",
    "La bandera roja más grande en un perfil de citas",
    "Lo que piensan tus amigos de tu pareja pero no te dicen",
    "Un motivo para friendzonear a alguien que no puedes decir en voz alta",
    "La peor forma de descubrir que te están siendo infiel",
    "Un apodo cariñoso que en realidad es un insulto",

    // Familia y amigos
    "Lo que piensas cuando tu madre te pregunta '¿cuándo me das nietos?'",
    "El secreto familiar que todos saben pero nadie menciona",
    "Lo peor de las reuniones familiares de Navidad",
    "Una verdad sobre tu familia que arruinaría cualquier cena",
    "Lo que realmente opinas del novio/a de tu hermano/a",
    "El WhatsApp más incómodo que has enviado al grupo equivocado",
    "Una excusa para no ir a la boda de un primo lejano",
    "Lo que piensas cuando tu amigo te cuenta su nuevo 'negocio multinivel'",
    "La razón real por la que no contestas los audios de tu tía",
    "Algo que tu madre no sabe que sabes sobre ella",

    // Internet y redes
    "Lo que realmente significa cuando alguien pone 'jaja' en WhatsApp",
    "Un usuario de Instagram que merece ser cancelado",
    "Lo más vergonzoso que has publicado borracho/a en redes",
    "El tipo de story de Instagram que más odias",
    "Una bio de Twitter que grita 'necesito atención'",
    "Lo que piensas cuando alguien te manda un audio de 5 minutos",
    "Un TikTok que te avergüenza haber visto entero",
    "El tipo de persona que merece ser bloqueada inmediatamente",
    "Lo más patético que has hecho por likes",
    "Una búsqueda de Google que explicaría mucho sobre ti",

    // Situaciones hipotéticas calientes
    "¿Qué harías con un millón de euros y cero moral?",
    "El famoso/a con quien tendrías un affair aunque arruinara tu vida",
    "Lo primero que harías si fueras invisible por un día",
    "¿Qué sacrificarías por tener el mejor sexo de tu vida?",
    "Un superpoder que usarías para fines 'personales'",
    "¿Qué harías si encontraras a tu doble exacto?",
    "El trabajo más fácil que harías por dinero... mucho dinero",
    "¿Qué cambiarías de tu cuerpo si no hubiera consecuencias?",
    "Una fantasía que jamás cumplirás... ¿o sí?",
    "Lo que harías en tu última noche en la Tierra",

    // Humor negro y random
    "El pensamiento más inapropiado que has tenido en un momento serio",
    "Una forma de morir que sería muy 'tú'",
    "Lo peor que podrías gritar en un avión",
    "Un crimen menor que cometerías si no hubiera cámaras",
    "El momento más inoportuno para soltar una carcajada",
    "Una teoría conspirativa que en secreto crees que podría ser verdad",
    "Lo más raro que has hecho solo/a en casa",
    "Un insulto tan específico que solo aplicaría a una persona",
    "La excusa más elaborada que has inventado para algo tonto",
    "Algo que nunca deberías decir en voz alta en un lugar público",
];

// Función para obtener prompts picantes aleatorios
export function getRandomSpicyPrompts(count: number): string[] {
    const shuffled = [...SPICY_PROMPTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// background.js - El cerebro de la extensión (Service Worker)

// Simulación temporal de notas almacenadas localmente
const notasFalsasDePrueba = [
    { id: "1", disparador: "gracias", contenido: "Muchas gracias por contactarnos, hemos recibido su reporte en el CRM." },
    { id: "2", disparador: "garantia", contenido: "El periodo de cobertura de su equipo técnico es de un año completo." },
    { id: "3", disparador: "reunion", contenido: "Hola, me gustaría agendar una breve sesión de soporte de 15 minutos." },
    { id: "4", disparador: "soporte", contenido: "Por favor, compártanos las capturas de pantalla del error para revisarlo." }
];

// Escuchamos los mensajes entrantes de otros componentes de la extensión
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // Validamos que la acción requerida sea buscar notas
    if (message.action === "search_notes") {
        const queryUsuario = message.query.toLowerCase();
        console.log(`🔍 Buscando notas locales que coincidan con: "${queryUsuario}"`);

        // Filtramos el arreglo buscando coincidencias en la palabra clave del disparador
        const notasFiltradas = notasFalsasDePrueba.filter(nota =>
            nota.disparador.toLowerCase().includes(queryUsuario)
        );

        // Devolvemos la respuesta al Content Script
        sendResponse({ results: notasFiltradas });
    }

    return true; // Obligatorio en Manifest V3 para indicar que la respuesta será asíncrona
});
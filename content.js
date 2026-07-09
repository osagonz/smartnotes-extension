// content.js - Detector de teclado para SmartNotes

// Variable global para almacenar el texto que el usuario escribe después del '/'
let palabraClave = "";
let escuchandoDisparador = false;

// Escuchamos el evento keydown en todo el documento
document.addEventListener('keydown', (event) => {
    const tecla = event.key;
    const elementoActivo = document.activeElement;

    // Verificamos si el usuario está escribiendo en un campo editable (input, textarea o contenteditable)
    const esCampoEditable = elementoActivo && (
        elementoActivo.tagName === 'INPUT' ||
        elementoActivo.tagName === 'TEXTAREA' ||
        elementoActivo.isContentEditable
    );

    if (!esCampoEditable) return; // Si no está editando nada, ignoramos la pulsación

    // CASO 1: Detectar el inicio del disparador
    if (tecla === '/') {
        escuchandoDisparador = true;
        palabraClave = ""; // Reiniciamos la palabra clave
        console.log("🎯 SmartNotes: Se detectó el prefijo '/'. Iniciando escucha...");
        return;
    }

    // CASO 2: Si ya estamos escuchando, capturamos las letras que siguen
    if (escuchandoDisparador) {

        // Si presiona espacio o escape, cancelamos la escucha de la nota
        if (tecla === ' ' || tecla === 'Escape') {
            escuchandoDisparador = false;
            palabraClave = "";
            console.log("❌ SmartNotes: Escucha cancelada por espacio o escape.");
            return;
        }

        // Si presiona la tecla de borrar (Backspace), eliminamos el último carácter
        if (tecla === 'Backspace') {
            palabraClave = palabraClave.slice(0, -1);
            if (palabraClave === "") {
                // Si borra hasta llegar de nuevo al '/', limpiamos todo
                escuchandoDisparador = false;
            }
            console.log("✏️ SmartNotes: Buscando actual:", palabraClave);
            return;
        }

        // Capturamos solo caracteres alfanuméricos simples (letras y números de un solo dígito de longitud)
        if (tecla.length === 1 && /^[a-zA-Z0-9]+$/.test(tecla)) {
            palabraClave += tecla;
            console.log("🔎 SmartNotes: Palabra clave incremental:", palabraClave);

            // TODO: Aquí llamaremos a la función que le pide las notas filtradas al Service Worker

            // LLAMADA AL PUENTE DE COMUNICACIÓN
            solicitarNotasAlServidorLocal(palabraClave);
        }
    }
});

// Función que envía el mensaje al Service Worker (background.js)
function solicitarNotasAlServidorLocal(query) {
    console.log(`📡 Enviando consulta al Service Worker: "${query}"`);

    chrome.runtime.sendMessage(
        { action: "search_notes", query: query },
        (response) => {
            if (chrome.runtime.lastError) {
                console.error("⚠️ Error en el puente de comunicación:", chrome.runtime.lastError.message);
                return;
            }

            if (response && response.results) {
                console.log("📥 Notas recibidas desde el Service Worker:", response.results);
                // TODO: Aquí pasaremos el arreglo de notas a la función que pintará el menú flotante
            }
        }
    );
}
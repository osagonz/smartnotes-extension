// content.js - Motor de Navegación por Teclado e Inyección

let palabraClave = "";
let escuchandoDisparador = false;
let popoverElement = null;

// NUEVAS VARIABLES DE CONTROL DE ESTADO
let notasActuales = [];      // Guarda las notas devueltas por el Service Worker
let indiceSeleccionado = 0;   // Rastrea qué elemento de la lista está activo (foco azul)

document.addEventListener('keydown', (event) => {
    const tecla = event.key;
    const elementoActivo = document.activeElement;

    const esCampoEditable = elementoActivo && (
        elementoActivo.tagName === 'INPUT' ||
        elementoActivo.tagName === 'TEXTAREA' ||
        elementoActivo.isContentEditable
    );

    if (!esCampoEditable) return;

    // --- BLOQUE A: CONTROL CON EL POPOVER ABIERTO ---
    if (escuchandoDisparador && popoverElement && popoverElement.style.display === 'block') {

        // 1. Navegar hacia abajo
        if (tecla === 'ArrowDown') {
            event.preventDefault(); // Evita que el cursor del CRM se mueva al final del texto
            actualizarFocoTeclado((indiceSeleccionado + 1) % notasActuales.length);
            return;
        }

        // 2. Navegar hacia arriba
        if (tecla === 'ArrowUp') {
            event.preventDefault(); // Evita que el cursor del CRM se mueva al inicio del texto
            actualizarFocoTeclado((indiceSeleccionado - 1 + notasActuales.length) % notasActuales.length);
            return;
        }

        // 3. Confirmar selección e Inyectar Nota
        if (tecla === 'Enter') {
            event.preventDefault(); // ¡CRÍTICO! Evita que el CRM envíe el mensaje o haga un salto de línea
            inyectarNotaEnCampo(notasActuales[indiceSeleccionado], elementoActivo);
            return;
        }
    }

    // --- BLOQUE B: DETECCIÓN ESTÁNDAR DEL DISPARADOR ---
    if (tecla === '/') {
        escuchandoDisparador = true;
        palabraClave = "";
        return;
    }

    if (escuchandoDisparador) {
        if (tecla === ' ' || tecla === 'Escape') {
            cerrarPopover();
            return;
        }

        if (tecla === 'Backspace') {
            palabraClave = palabraClave.slice(0, -1);
            if (palabraClave === "") {
                cerrarPopover();
            } else {
                solicitarNotasAlServidorLocal(palabraClave, elementoActivo);
            }
            return;
        }

        if (tecla.length === 1 && /^[a-zA-Z0-9]+$/.test(tecla)) {
            palabraClave += tecla;
            solicitarNotasAlServidorLocal(palabraClave, elementoActivo);
        }
    }
});

function solicitarNotasAlServidorLocal(query, elementoActivo) {
    chrome.runtime.sendMessage(
        { action: "search_notes", query: query },
        (response) => {
            if (chrome.runtime.lastError) return;

            if (response && response.results && response.results.length > 0) {
                notasActuales = response.results; // Guardamos las notas globalmente
                renderizarPopover(response.results, elementoActivo);
            } else {
                cerrarPopover();
            }
        }
    );
}

function renderizarPopover(notas, elementoActivo) {
    if (!popoverElement) {
        popoverElement = document.createElement('div');
        popoverElement.className = 'smartnotes-popover';
        document.body.appendChild(popoverElement);
    }

    popoverElement.innerHTML = '';
    const lista = document.createElement('ul');
    lista.className = 'smartnotes-list';

    notas.forEach((nota, index) => {
        const item = document.createElement('li');
        item.className = 'smartnotes-item';

        // Asignamos la clase active al índice guardado
        if (index === indiceSeleccionado) item.classList.add('active');

        item.innerHTML = `
            <span class="smartnotes-trigger">/${nota.disparador}</span>
            <span class="smartnotes-preview">${nota.contenido}</span>
        `;

        // Soporte para selección con clic del ratón
        item.addEventListener('click', () => {
            inyectarNotaEnCampo(nota, elementoActivo);
        });

        lista.appendChild(item);
    });

    popoverElement.appendChild(lista);

    const rect = elementoActivo.getBoundingClientRect();
    popoverElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popoverElement.style.left = `${rect.left + window.scrollX}px`;
    popoverElement.style.display = 'block';
}

// CAMBIA EL FOCO VISUAL EN EL DOM SIN RE-RENDERIZAR TODO EL CONTENEDOR
function actualizarFocoTeclado(nuevoIndice) {
    indiceSeleccionado = nuevoIndice;
    const items = popoverElement.querySelectorAll('.smartnotes-item');

    items.forEach((item, index) => {
        if (index === indiceSeleccionado) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' }); // Asegura el scroll automático si hay muchas notas
        } else {
            item.classList.remove('active');
        }
    });
}

// INYECTA EL TEXTO LARGO EN EL ELEMENTO ACTIVO REEMPLAZANDO EL DISPARADOR
function inyectarNotaEnCampo(nota, elementoActivo) {
    if (!nota) return;

    const textoAInyectar = nota.contenido;

    if (elementoActivo.tagName === 'INPUT' || elementoActivo.tagName === 'TEXTAREA') {
        const valorActual = elementoActivo.value;
        const posicionCursor = elementoActivo.selectionStart;

        // Calculamos dónde terminaba el disparador para cortarlo (ej: /gracias tiene longitud palabraClave + 1)
        const inicioDisparador = posicionCursor - (palabraClave.length + 1);

        // Construimos la nueva cadena reemplazando desde el '/' hasta el final de la palabra clave
        const nuevoTexto = valorActual.slice(0, inicioDisparador) + textoAInyectar + valorActual.slice(posicionCursor);

        elementoActivo.value = nuevoTexto;

        // Devolvemos el foco del cursor al final del texto inyectado
        const nuevaPosicionCursor = inicioDisparador + textoAInyectar.length;
        elementoActivo.setSelectionRange(nuevaPosicionCursor, nuevaPosicionCursor);

    } else if (elementoActivo.isContentEditable) {
        // Soporte básico para editores enriquecidos avanzados (como el de WhatsApp Web)
        elementoActivo.focus();
        document.execCommand('insertText', false, textoAInyectar);
    }

    // Disparamos un evento 'input' nativo para que el CRM note que el texto cambió de valor internamente
    elementoActivo.dispatchEvent(new Event('input', { bubbles: true }));

    cerrarPopover();
}

function cerrarPopover() {
    escuchandoDisparador = false;
    palabraClave = "";
    notasActuales = [];
    indiceSeleccionado = 0; // Reseteamos al primer elemento
    if (popoverElement) {
        popoverElement.style.display = 'none';
    }
}
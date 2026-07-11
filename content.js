// content.js - Lógica del DOM y Puente de Comunicación

let palabraClave = "";
let escuchandoDisparador = false;
let popoverElement = null; // Guardará la referencia al menú flotante en el DOM

document.addEventListener('keydown', (event) => {
    const tecla = event.key;
    const elementoActivo = document.activeElement;

    const esCampoEditable = elementoActivo && (
        elementoActivo.tagName === 'INPUT' ||
        elementoActivo.tagName === 'TEXTAREA' ||
        elementoActivo.isContentEditable
    );

    if (!esCampoEditable) return;

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

// Envía el mensaje y gestiona la respuesta para pintar la UI
function solicitarNotasAlServidorLocal(query, elementoActivo) {
    chrome.runtime.sendMessage(
        { action: "search_notes", query: query },
        (response) => {
            if (chrome.runtime.lastError) return;

            if (response && response.results && response.results.length > 0) {
                // Dibujar o actualizar el menú flotante en pantalla
                renderizarPopover(response.results, elementoActivo);
            } else {
                // Si no hay resultados que coincidan, ocultamos el menú
                cerrarPopover();
            }
        }
    );
}

// CREACIÓN E INYECCIÓN DINÁMICA DEL POPOVER EN EL DOM
function renderizarPopover(notas, elementoActivo) {
    // Si el popover no existe en el DOM, lo creamos e inyectamos al <body>
    if (!popoverElement) {
        popoverElement = document.createElement('div');
        popoverElement.className = 'smartnotes-popover';
        document.body.appendChild(popoverElement);
    }

    // Limpiamos el contenido anterior para llenarlo con los nuevos resultados
    popoverElement.innerHTML = '';

    // Creamos el contenedor de la lista
    const lista = document.createElement('ul');
    lista.className = 'smartnotes-list';

    notas.forEach((nota, index) => {
        const item = document.createElement('li');
        item.className = 'smartnotes-item';
        // Simulamos que el primer elemento de la lista está activo por defecto
        if (index === 0) item.classList.add('active');

        item.innerHTML = `
            <span class="smartnotes-trigger">/${nota.disparador}</span>
            <span class="smartnotes-preview">${nota.contenido}</span>
        `;

        lista.appendChild(item);
    });

    popoverElement.appendChild(lista);

    // POSICIONAMIENTO GEOMÉTRICO DINÁMICO
    // Obtenemos las coordenadas y dimensiones de la caja de texto activa del CRM
    const rect = elementoActivo.getBoundingClientRect();

    // Posicionamos el popover justo debajo del cuadro de texto, sumando el scroll actual de la página
    popoverElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
    popoverElement.style.left = `${rect.left + window.scrollX}px`;
    popoverElement.style.display = 'block';
}

// Función limpia para remover el elemento cuando no se necesite
function cerrarPopover() {
    escuchandoDisparador = false;
    palabraClave = "";
    if (popoverElement) {
        popoverElement.style.display = 'none';
    }
}
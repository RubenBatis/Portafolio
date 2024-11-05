import { Viewer } from './Viewer.js';
export class ImageViewer extends Viewer {
    constructor(contentFolder, parentElement, { initContent = 0, loader = null } = {}) {
        super(contentFolder, parentElement, loader);
        this.imageElement = document.createElement('img');
        this.imageElement.style.maxWidth = '100%';
        this.imageElement.style.maxHeight = '100%';
        this.imageElement.style.transformOrigin = 'center center';
        this.imageElement.draggable = false; // Evitar arrastrar la imagen accidentalmente

        this.parentElement.appendChild(this.imageElement);
        this.navigationAllowed = false;

        // Variables para el control de "pan continuo"
        this.isPanning = false;
        this.startPanPosition = { x: 0, y: 0 };
        this.imageOffset = { x: 0, y: 0 };

        // Eventos para zoom y pan
		this.imageElement.addEventListener('wheel', (e) => this.#handleZoom(e));
        this.imageElement.addEventListener('mousedown', (e) => this.#startPan(e));
        window.addEventListener('mousemove', (e) => this.#panImage(e));
        window.addEventListener('mouseup', () => this.#stopPan());
		
		this.applyConfig(this.loader.resourceNames[initContent]);
    }

    applyConfig(modelName) {
        const config = super.applyConfig(modelName);
        this.imageElement.src = `${this.loader.contentFolder}/${this.loader.images[modelName].src}`;
        this.navigationAllowed = config.navigationAllowed || false;

        // Ocultar botones de reproducción
        if (this.pauseButton) {
            this.pauseButton.style.display = 'none';
        }

        return config;
    }
	
	// Manejar el zoom
    #handleZoom(event) {
        if (this.navigationAllowed) {
            event.preventDefault();
            const scaleAmount = event.deltaY > 0 ? 0.9 : 1.1; // Escalar hacia dentro o hacia afuera
            const currentTransform = getComputedStyle(this.imageElement).transform;
            const newScale = currentTransform === 'none' ? scaleAmount : parseFloat(currentTransform.split(',')[0].slice(7)) * scaleAmount;
            this.imageElement.style.transform = `scale(${newScale})`;
        }
    }

    // Iniciar el pan al presionar la rueda (botón central)
    #startPan(event) {
        if (this.navigationAllowed && event.button === 1) { // Botón 1 es el botón central (rueda)
            event.preventDefault();
            this.isPanning = true;
            this.startPanPosition = { x: event.clientX, y: event.clientY };
        }
    }

    // Mover la imagen mientras se mantiene presionada la rueda
    #panImage(event) {
        if (this.isPanning) {
            event.preventDefault();
            
            // Calcular el desplazamiento en relación al punto inicial
            const deltaX = event.clientX - this.startPanPosition.x;
            const deltaY = event.clientY - this.startPanPosition.y;

            // Actualizar la posición de la imagen
            this.imageOffset.x += deltaX;
            this.imageOffset.y += deltaY;
            this.imageElement.style.transform = `translate(${this.imageOffset.x}px, ${this.imageOffset.y}px)`;

            // Actualizar el punto de inicio para el siguiente movimiento
            this.startPanPosition = { x: event.clientX, y: event.clientY };
        }
    }

    // Detener el "pan" cuando se suelta la rueda
    #stopPan() {
        if (this.isPanning) {
            this.isPanning = false;
        }
    }
}
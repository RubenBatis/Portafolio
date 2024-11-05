import { Viewer } from './Viewer.js';
export class VideoViewer extends Viewer {
    constructor(contentFolder, parentElement, { initContent = 0, loader = null } = {}) {
        super(contentFolder, parentElement, loader);
        this.videoElement = document.createElement('video');
        this.videoElement.style.maxWidth = '100%';
        this.videoElement.style.maxHeight = '100%';
        this.videoElement.style.transformOrigin = 'center center';
        this.videoElement.controls = false; // Desactivar los controles predeterminados
        this.parentElement.appendChild(this.videoElement);

        this.isPanning = false;
        this.startPanPosition = { x: 0, y: 0 };
        this.videoOffset = { x: 0, y: 0 };
        this.navigationAllowed = false;

        // Crear botón de play/pausa personalizado
        this.playPauseButton = document.createElement('button');
        this.playPauseButton.textContent = 'Play';
        this.playPauseButton.style.position = 'absolute';
        this.playPauseButton.style.bottom = '10px';
        this.playPauseButton.style.left = '10px';
        this.playPauseButton.addEventListener('click', () => this.togglePlayPause());
        this.parentElement.appendChild(this.playPauseButton);

        // Eventos para el control de "pan continuo"
        this.videoElement.addEventListener('mousedown', (e) => this.#startPan(e));
        window.addEventListener('mousemove', (e) => this.#panVideo(e));
        window.addEventListener('mouseup', () => this.#stopPan());
    }

    applyConfig(modelName) {
        const config = super.applyConfig(modelName);
        this.videoElement.src = `${this.loader.contentFolder}/${this.loader.videos[modelName].src}`;
        this.navigationAllowed = config.navigationAllowed || false;
        this.videoElement.loop = config.loop || false;

        // Mostrar u ocultar controles de reproducción personalizados
        if (config.playbackControls) {
            this.playPauseButton.style.display = 'block';
        } else {
            this.playPauseButton.style.display = 'none';
        }

        return config;
    }
	
	handleZoom(event) {
		if (!this.navigationAllowed) return;

		event.preventDefault(); // Evita el comportamiento predeterminado de la rueda
		const zoomIntensity = 0.1; // Ajusta la intensidad del zoom
		let scale = parseFloat(this.videoElement.style.transform.replace(/[^0-9.]/g, '')) || 1;

		// Determinar si hacer zoom in o zoom out
		if (event.deltaY < 0) {
			scale += zoomIntensity; // Zoom in
		} else {
			scale -= zoomIntensity; // Zoom out
		}

		// Limitar el nivel de zoom a un rango razonable
		scale = Math.max(0.5, Math.min(scale, 3)); // Min: 0.5x, Max: 3x

		// Aplicar la escala al video
		this.videoElement.style.transform = `scale(${scale})`;
	}

    // Métodos para play/pausa
    togglePlayPause() {
        if (this.videoElement.paused) {
            this.videoElement.play();
            this.playPauseButton.textContent = 'Pause';
        } else {
            this.videoElement.pause();
            this.playPauseButton.textContent = 'Play';
        }
    }

    // Iniciar el "pan" al presionar la rueda (botón central)
    #startPan(event) {
        if (this.navigationAllowed && event.button === 1) { // Botón central (rueda)
            event.preventDefault();
            this.isPanning = true;
            this.startPanPosition = { x: event.clientX, y: event.clientY };
        }
    }

    // Mover el video mientras se mantiene presionada la rueda
    #panVideo(event) {
        if (this.isPanning) {
            event.preventDefault();

            // Calcular el desplazamiento en relación al punto inicial
            const deltaX = event.clientX - this.startPanPosition.x;
            const deltaY = event.clientY - this.startPanPosition.y;

            // Actualizar la posición del video
            this.videoOffset.x += deltaX;
            this.videoOffset.y += deltaY;
            this.videoElement.style.transform = `translate(${this.videoOffset.x}px, ${this.videoOffset.y}px)`;

            // Actualizar el punto de inicio para el siguiente movimiento
            this.startPanPosition = { x: event.clientX, y: event.clientY };
        }
    }

    // Detener el "pan" al soltar la rueda
    #stopPan() {
        if (this.isPanning) {
            this.isPanning = false;
        }
    }
}

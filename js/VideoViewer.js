import { Viewer } from './Viewer.js';
export class VideoViewer extends Viewer {
    constructor(parentElement, {
		initContent = 0,
		loader = null,
		currentItemIndex = {"value":0},
		applyConfigOnInit = true,
		orientation = "bottom", 
		appendControls = true,
		controls = null
	} = {}) {
        super(parentElement, loader, {orientation: orientation, appendControls: appendControls});
        this.videoElement = document.createElement('video');
        this.videoElement.style.transformOrigin = 'center center';
        this.videoElement.controls = false; // Desactivar los controles predeterminados
		this.videoElement.style.pointerEvents = "none";
		this.videoElement.currentTime = 0;
		
		this.videoWrapper = document.createElement('div');
		this.videoWrapper.className = "wrapper " + orientation;
		this.videoWrapper.style.overflow = "hidden";
		this.videoWrapper.appendChild(this.videoElement);		

		this.videoFrame =  document.createElement('div');
		this.videoFrame.className = "viewerContent " + orientation;
		this.videoFrame.style.overflow = "hidden";
		this.videoFrame.appendChild(this.videoWrapper);
		this.resize();

        this.viewerElement.appendChild(this.videoFrame);

		this.domElement = this.videoFrame;
		
		this.currentItemIndex = currentItemIndex;
		
		//variables para pan y zoom
		this.currentScale = 1;
        this.posOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.startPanPosition = { x: 0, y: 0 };
        this.mouseButton = null;

		if (applyConfigOnInit) {
			this.ready.then(() => {
				this.applyConfig(this.loader.resourceNames[initContent]);
			}).catch(error => {
				console.error("Error al aplicar la configuración en ImageViewer:", error);
			});
		}
		
		// Escucha para el zoom y el pan
		this.currentMousePosition = { x: 0, y: 0 }; // Inicializa la posición actual del ratón
		this.videoFrame.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
		this.videoFrame.addEventListener('mousedown', (e) => this.#startPan(e));
		window.addEventListener('mousemove', (e) => this.#updateMousePosition(e)); // Actualiza la posición del ratón
		window.addEventListener('mousemove', (e) => this.#panVideo(e)); // Pan manual
		window.addEventListener('mouseup', () => this.#stopPan());

		this.videoElement.addEventListener('loadeddata', () => {
			this.centerAndScaleVideo();  // Llama a centrar el vídeo después de cargar
		});
    }
	
	// Centra el vídeo dentro del contenedor
	centerAndScaleVideo(force = false) {
		/*
		if (!force && (this.currentScale !== 1 || this.posOffset.x !== 0 || this.posOffset.y !== 0)) {
			return;
		}
		const containerWidth = parseFloat(this.videoFrame.clientWidth);
		const containerHeight = parseFloat(this.videoFrame.clientHeight);
		const videoWidth = parseFloat(this.videoElement.videoWidth);
		const videoHeight = parseFloat(this.videoElement.videoHeight);

		let scaleX = containerWidth / videoWidth;
		let scaleY = containerHeight / videoHeight;
		let scale = scaleX > scaleY ? scaleY : scaleX;

		this.currentScale = scale;

		// Calcula el desplazamiento inicial para centrar el vídeo
		this.posOffset = {
			"x":(containerWidth - videoWidth) / (2 * scale), 
			"y": (containerHeight - videoHeight) / (2 * scale)
		};

		this.applyTransform(); // Aplica el desplazamiento*/
	}

	saveConfig(videoName) {
		this.loader.configs[videoName].scale = this.currentScale || 1;
		this.loader.configs[videoName].offset = this.posOffset || {"x": 0, "y": 0};
	}
	
    applyConfig(videoName) {
        const config = super.applyConfig(videoName);

        this.videoElement.src = `${this.loader.videos[videoName].src}`;
        this.navigationAllowed = config.navigationAllowed || false;
        this.videoElement.loop = config.loop || true;
		
		this.videoElement.muted = true;
		this.videoElement.play();  // revisar y poner según parámetro en el json
		this.currentScale = config.scale || 1;
		this.posOffset = config.offset || {"x": 0, "y": 0};
		this.applyTransform();

        // Mostrar u ocultar controles de reproducción personalizados
        if (config.playbackControls) {
            //this.playPauseButton.style.display = 'block';
			this.mediaControls.playPause.button.style.display = 'block';
        } else {
            //this.playPauseButton.style.display = 'none';
			this.mediaControls.playPause.button.style.display = 'none';
        }

		// Lógica específica para habilitar controles en videos
		this.selectControls({
			playPause: true,          // Siempre mostrar
			toggleDescription: true,  // Siempre mostrar
			reset: true,              // Siempre mostrar
			changeAnimation: false    // No se necesita para videos
		});
    }

	// Manejar el zoom
	handleZoom(event) {
		event.preventDefault(); // Evita el comportamiento de desplazamiento de la rueda
		event.stopPropagation();
		if (!this.navigationAllowed) return;
		const zoomIntensity = 0.1; // Ajusta la intensidad del zoom

		// Obtén la escala actual del video o usa 1 como valor por defecto
		let scale = this.currentScale || 1;
		
		// Aumenta o disminuye la escala según la dirección de desplazamiento
		if (event.deltaY < 0) {
			scale += zoomIntensity; // Zoom in
		} else {
			scale -= zoomIntensity; // Zoom out
		}
		
		// Limitar el nivel de zoom
		scale = Math.max(0.5, Math.min(scale, 5)); // Rango de 0.5x a 5x
		this.currentScale = scale; // Almacena la escala actual

		// Aplica la escala y conserva el desplazamiento actual
		this.videoElement.style.transform = `scale(${scale}) translate(${this.posOffset.x}px, ${this.posOffset.y}px)`;
		this.toggleResetViewButtonIcon();
	}

    // Métodos para play/pausa
    toggleAnimationPause() {
        if (this.videoElement.paused) {
            this.videoElement.play();
        } else {
            this.videoElement.pause();
        }
		this.togglePauseButtonIcon(!this.videoElement.paused)
    }

	// Inicia el pan manual o continuo según el botón
	#startPan(event) {
		if (!this.navigationAllowed) return;

		event.preventDefault();
		this.isPanning = true;
		this.startPanPosition = { x: event.clientX, y: event.clientY };

		if (event.button === 0) { // Botón izquierdo: pan manual
			this.mouseButton = "left";
		} else if (event.button === 1) { // Botón central: pan automático
			this.mouseButton = "middle";
			this.autoPanInterval = setInterval(() => this.#autoPan(), 16); // Ejecuta #autoPan cada 16ms (60fps)
		}
	}

	// Pan manual: mueve el video en sincronía con el ratón
	#panVideo(event) {
		if (!this.isPanning || this.mouseButton !== "left") return;

		event.preventDefault();
		const deltaX = event.clientX - this.startPanPosition.x;
		const deltaY = event.clientY - this.startPanPosition.y;

		// Aplica el desplazamiento al video
		this.posOffset.x += deltaX / this.currentScale;
		this.posOffset.y += deltaY / this.currentScale;

		this.applyTransform();

		// Actualiza la posición inicial
		this.startPanPosition = { x: event.clientX, y: event.clientY };
		this.toggleResetViewButtonIcon();
	}

	// Pan automático: ajusta la posición en función de la distancia actual al punto inicial
	#autoPan() {
		if (this.mouseButton !== "middle") return;

		// Calcula el desplazamiento entre el ratón y el punto inicial
		const deltaX = this.currentMousePosition.x - this.startPanPosition.x;
		const deltaY = this.currentMousePosition.y - this.startPanPosition.y;

		const autoPanSensitivity = 0.005; // Ajusta esta sensibilidad según la velocidad deseada

		// Aplica el desplazamiento escalado al video
		this.posOffset.x += deltaX * autoPanSensitivity;
		this.posOffset.y += deltaY * autoPanSensitivity;

		this.applyTransform();
	}

	// Actualiza la posición actual del ratón (para pan automático)
	#updateMousePosition(event) {
		if (this.isPanning && this.mouseButton === "middle") {
			this.currentMousePosition = { x: event.clientX, y: event.clientY };
		}
	}

	// Detiene el pan y limpia el intervalo si es pan automático
	#stopPan() {
		if (!this.isPanning) return;

		this.isPanning = false;
		if (this.mouseButton === "middle") {
			clearInterval(this.autoPanInterval);
			this.autoPanInterval = null;
		}
		this.mouseButton = null;
	}

	// Aplica el desplazamiento y la escala al video
	applyTransform() {
		const scale = this.currentScale || 1;
		this.videoElement.style.transform = `scale(${scale}) translate(${this.posOffset.x}px, ${this.posOffset.y}px)`;
	}
	
	reset() {
		this.videoElement.currentTime = 0;
	}
	
	resetView () {
		// Restablecer valores de pan y zoom
		this.currentScale = 1;
		this.posOffset = { x: 0, y: 0 };

		// Aplica los cambios
		this.applyTransform();
		this.toggleResetViewButtonIcon();
	}
	
	toggleResetViewButtonIcon() {
		const isPanZoomDefault = this.currentScale === 1 && this.posOffset.x === 0 && this.posOffset.y === 0;

		if (isPanZoomDefault) {
			this.mediaControls.resetView.button.style.display = 'none';
		} else {
			this.mediaControls.resetView.button.style.display = 'block';
		}
	}
}

/*	The delirium archive is a digital art portfolio application, currently designed
	for individual use but with potential to support multiple users in the future. 
    Copyright (C) 2024 Rubén Bautista Reyes

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

	You can contact the author via email: RubenBatis@gmail.com
*/

import { Viewer } from './Viewer.js';
export class ImageViewer extends Viewer {
    constructor(parentElement, {
		initContent = 0,
		loader = null,
		currentItemIndex = {"value":0},
		applyConfigOnInit = true,
		orientation = "bottom", 
		appendControls = true,
		controls = null,
		language = "es",
		upperParent = null
	} = {}){
        super(parentElement, loader, {orientation: orientation, appendControls: appendControls, upperParent: upperParent});
        this.imageElement = document.createElement('img');
        this.imageElement.style.transformOrigin = 'center center';
        this.imageElement.draggable = false; // Evitar arrastrar la imagen accidentalmente
		this.imageElement.style.pointerEvents = "none";

		this.imageWrapper = document.createElement('div');
		this.imageWrapper.className = "wrapper " + orientation;
		this.imageWrapper.style.overflow = "hidden";
		this.imageWrapper.appendChild(this.imageElement);
	
		this.imageFrame =  document.createElement('div');
		this.imageFrame.className = "viewerContent " + orientation;
		this.imageFrame.style.overflow = "hidden";
		this.imageFrame.appendChild(this.imageWrapper);
		
		this.resize();
		
		this.viewerElement.appendChild(this.imageFrame);
		
		this.domElement = this.imageFrame;

		this.currentItemIndex = currentItemIndex;
		
		this.language = language;

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
		this.imageFrame.addEventListener('wheel', (e) => this.handleZoom(e), { passive: false });
		this.imageFrame.addEventListener('mousedown', (e) => this.#startPan(e));
		window.addEventListener('mousemove', (e) => this.#updateMousePosition(e)); // Actualiza la posición del ratón
		window.addEventListener('mousemove', (e) => this.#panImage(e)); // Pan manual
		window.addEventListener('mouseup', () => this.#stopPan());

		this.imageElement.addEventListener('load', () => {
			this.centerAndScaleImage();  // Llama a centrar el vídeo después de cargar
		});
    }

	// Centra el vídeo dentro del contenedor
	centerAndScaleImage(force = false) {
		/*
		if (!force && (this.currentScale !== 1 || this.posOffset.x !== 0 || this.posOffset.y !== 0)) {
			return;
		}
		const containerWidth = parseFloat(this.imageFrame.clientWidth);
		const containerHeight = parseFloat(this.imageFrame.clientHeight);
		let width = parseFloat(this.imageElement.width);
		let height = parseFloat(this.imageElement.height);
		
		const isSVG = this.imageElement.src.split('.').pop().toLowerCase() === "svg";
		if (isSVG) {
			const viewBox = this.imageElement.viewBox?.baseVal;
			if (viewBox) {
				console.log(viewBox);
				width = isSVG ? this.imageElement.viewBox.baseVal.width : width;
				height = isSVG ? this.imageElement.viewBox.baseVal.height : height;
			} else {
				console.log("no hay viewBox");
				try {
					const svgElement = this.imageElement.contentDocument?.documentElement;
					if (svgElement) {
						const bbox = svgElement.getBBox();
						width = bbox.width;
						height = bbox.height;
					} else {
						console.log("No se pudo acceder al contenido del SVG. Usando fallback.");
						width = this.imageElement.clientWidth || 0;
						height = this.imageElement.clientHeight || 0;
					}
				} catch (error) {
					console.error("Error al calcular BBox del SVG:", error);
					width = this.imageElement.clientWidth || 0;
					height = this.imageElement.clientHeight || 0;
				}
			}
		}

		let scaleX = containerWidth / width;
		let scaleY = containerHeight / height;
		let scale = scaleX > scaleY ? scaleY : scaleX;

		this.currentScale = scale;

		// Calcula el desplazamiento inicial para centrar el vídeo
		this.posOffset = {
			"x":(containerWidth - width) / (2 * scale), 
			"y": (containerHeight - height) / (2 * scale)
		};

		this.applyTransform(); // Aplica el desplazamiento inicial*/
	}

	saveConfig(imageName) {
		this.loader.configs[imageName].scale = this.currentScale || 1;
		this.loader.configs[imageName].offset = this.posOffset || {"x": 0, "y": 0};
	}

    applyConfig(imageName) {
		const config = super.applyConfig(imageName);

        this.imageElement.src = `${this.loader.images[imageName].src}`;
        this.navigationAllowed = config.navigationAllowed || false;

		this.currentScale = config.scale || 1;
		this.posOffset = config.offset || {"x": 0, "y": 0};
		this.applyTransform();

		// Lógica específica para habilitar controles en imágenes
		this.selectControls({
			playPause: false,         // No se necesita para imágenes
			toggleDescription: true,  // Siempre mostrar
			reset: false,             // No se necesita para imágenes
			changeAnimation: false    // No se necesita para imágenes
		});
		this.parentElement.offsetHeight;
    }

	// Manejar el zoom
	handleZoom(event) {
		event.preventDefault(); // Evita el comportamiento de desplazamiento de la rueda
		event.stopPropagation();
		if (!this.navigationAllowed) return;
		const zoomIntensity = 0.1; // Ajusta la intensidad del zoom

		// Obtén la escala actual de la imagen o usa 1 como valor por defecto
		let scale = this.currentScale || 1;
		
		// Aumenta o disminuye la escala según la dirección de desplazamiento
		if (event.deltaY < 0) {
			scale += zoomIntensity; // Zoom in
		} else {
			scale -= zoomIntensity; // Zoom out
		}
		
		// Limitar el nivel de zoom
		scale = Math.max(0.5, Math.min(scale, 5)); // Rango de 0.5x a 3x
		this.currentScale = scale; // Almacena la escala actual

		// Aplica la escala y conserva el desplazamiento actual
		this.imageElement.style.transform = `scale(${scale}) translate(${this.posOffset.x}px, ${this.posOffset.y}px)`;
		this.toggleResetViewButtonIcon();
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

	// Pan manual: mueve la imagen en sincronía con el ratón
	#panImage(event) {
		if (!this.isPanning || this.mouseButton !== "left") return;

		event.preventDefault();
		const deltaX = event.clientX - this.startPanPosition.x;
		const deltaY = event.clientY - this.startPanPosition.y;

		// Aplica el desplazamiento a la imagen
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

		// Aplica el desplazamiento escalado a la imagen
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

	// Aplica el desplazamiento y la escala a la imagen
	async applyTransform() {
		const scale = this.currentScale || 1;
		const offset = this.posOffset || {x: 0, y: 0};

		this.imageElement.style.transform = `scale(${scale}) translate(${this.posOffset.x}px, ${this.posOffset.y}px)`;
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
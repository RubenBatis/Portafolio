import { Loader } from './Loader.js';
export class Viewer {
	constructor(parentElement, loader = null, {orientation = "bottom", appendControls = true} = {}) {
		this.loader = loader;
		this.parentElement = parentElement;
		
		this.viewerElement = document.createElement("div");
		this.viewerElement.className = "viewer " + orientation;
		this.parentElement.appendChild(this.viewerElement);
		
		this.appendControls = appendControls;
		
		this.createDescriptionPanel();
		this.createAnimControls();
		
		window.addEventListener('resize', () => {
			this.resize();
		});
		
		// La promesa `ready` depende de `Loader.ready`
        this.ready = this.loader.ready.then(() => {
            return true;
        }).catch(error => {
            console.error("Error en la carga del Loader en Viewer:", error);
            return false;
        });
	}
	
	createUniqueElement(tag, selector) {
		let element = document.querySelector(selector);
		if (!element) {
			element = document.createElement(tag);
			if (selector.startsWith('#')) {
				element.id = selector.slice(1);
			} else if (selector.startsWith('.')) {
				element.className = selector.slice(1);
			}
		}
		return element;
	}
	
	appendIfNeeded(parentElement, childElement) {
		if (this.appendControls) {
			parentElement.appendChild(childElement);
		}
	}
	
	setActive(isActive) {
        this.isActive = isActive;
        // Dejar de escuchar eventos de visores inactivos
        if (isActive) {
            this.toggleButton.classList.add("active");
        } else {
            this.toggleButton.classList.remove("active");
        }
    }
	
	resize() {}
	
	setLoader(loader) {
		this.loader = loader;
	}
	
	// Actualizar la descripción y los controles
	updateDescription(description, backgroundColor) {
		const descriptionDiv = document.querySelector(".description-panel");
		if (descriptionDiv) {
			descriptionDiv.innerHTML = description.replace(/\n/g, '<br>');
			descriptionDiv.style.color = backgroundColor;
			this.toggleButton.style.color = backgroundColor;
			this.playPauseButton.style.color = backgroundColor;
		}
	}
	
	// Crear y añadir el panel de descripción
	createDescriptionPanel() {
		this.descriptionPanel = this.createUniqueElement('div', '.description-panel');
		this.descriptionPanel.style.display = 'none';
		this.appendIfNeeded(this.parentElement, this.descriptionPanel);
		
		this.descriptionPanel.addEventListener('wheel', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.descriptionPanel.scrollBy(0, e.deltaY);
		}, { passive: false });

		// Crear y añadir el botón de mostrar/ocultar
		this.toggleButton = this.createUniqueElement('button', '.toggle-button');
		this.toggleButton.innerText = '\u2261';
		this.toggleButton.addEventListener('click', () => {
			if (this.isActive) {
				if (this.descriptionPanel.style.display === 'none') {
					this.descriptionPanel.style.display = 'block';
					this.descriptionPanel.offsetHeight;
					this.descriptionPanel.style.filter = 'invert(100%)'
				} else {
					this.descriptionPanel.style.display = 'none';
				}
			}
		});
		this.appendIfNeeded(this.parentElement, this.toggleButton);
	}
	
	// Método que aplica la configuración de cada medio a la visualización
	applyConfig(contentName) {
		const config = this.loader.configs[contentName];
		// Mostrar la descripción en el HTML
		this.updateDescription(config.description, config.backgroundColor);
		this.domElement.style.backgroundColor = config.backgroundColor;
		return config;
	}
	
	// Crear y añadir los controles de reproducción
	createAnimControls() {
		this.playPauseButton = this.createUniqueElement('button', '.pause-button');
		this.playPauseButton.innerHTML = '⏸';
		this.appendIfNeeded(this.parentElement, this.playPauseButton);
		this.isPaused = false;
		
		// Alternar la animación al hacer clic en el botón
		this.playPauseButton.addEventListener('click', () => {
			if (this.isActive) {
				this.toggleAnimationPause();
			}
		});

		// Alternar con la tecla Espacio
		window.addEventListener('keydown', (event) => {
			if (event.code === 'Space') {
				if (this.isActive) {
					this.toggleAnimationPause();
				}
			}
		});
	}
	
	// Método para alternar la pausa/reproducción
	toggleAnimationPause() {}
	
	// Modificar el botón de pausa según el estado
	togglePauseButtonIcon(paused) {
		paused ? this.playPauseButton.innerHTML = '⏸' : this.playPauseButton.innerHTML = '⏵';
	}
}
import { Loader } from './Loader.js';
export class Viewer {
	constructor(contentFolder, parentElement, loader = null) {
		this.loader = loader || new Loader(contentFolder);
		this.parentElement = parentElement;
		
		this.createDescriptionPanel();
		this.createAnimControls();
		
		let auxElement = this.createUniqueElement("div", ".viewerContainer");
		auxElement.style.display = "block";
		parentElement.appendChild(auxElement);
		this.widthRatio = parseFloat(getComputedStyle(auxElement).getPropertyValue('width')) / 
						  parseFloat(getComputedStyle(parentElement).getPropertyValue('width'));
		this.heightRatio = parseFloat(getComputedStyle(auxElement).getPropertyValue('height')) / 
		                   parseFloat(getComputedStyle(parentElement).getPropertyValue('height'));
		parentElement.removeChild(auxElement);
		
		window.addEventListener('resize', () => {
			this.resize();
		});
		
		// La promesa `ready` depende de `Loader.ready`
        this.ready = this.loader.ready.then(() => {
            console.log("Loader listo en Viewer");
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
	
	resize() {}
	
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
		this.createUniqueElement('div', '.description-panel');
		this.descriptionPanel.style.display = 'none';
		this.parentElement.appendChild(this.descriptionPanel);
		
		this.descriptionPanel.addEventListener('wheel', (e) => {
			e.preventDefault();
			this.descriptionPanel.scrollBy(0, e.deltaY);
		});

		// Crear y añadir el botón de mostrar/ocultar
		this.toggleButton = this.createUniqueElement('button', '.toggle-button');
		this.toggleButton.innerText = '\u2261';
		this.toggleButton.addEventListener('click', () => {
			if (this.descriptionPanel.style.display === 'none') {
				this.descriptionPanel.style.display = 'block';
				this.descriptionPanel.offsetHeight;
				this.descriptionPanel.style.filter = 'invert(100%)'
			} else {
				this.descriptionPanel.style.display = 'none';
			}
		});
		this.parentElement.appendChild(this.toggleButton);
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
		this.parentElement.appendChild(this.playPauseButton);
		this.isPaused = false;
		
		// Alternar la animación al hacer clic en el botón
		this.playPauseButton.addEventListener('click', () => this.toggleAnimationPause());

		// Alternar con la tecla Espacio
		window.addEventListener('keydown', (event) => {
			if (event.code === 'Space') {
				this.toggleAnimationPause();
			}
		});
	}
	
	// Método para alternar la pausa/reproducción
	toggleAnimationPause() {}
	
	// Modificar el botón de pausa según el estado
	togglePauseButtonIcon(paused) {
		paused ? this.playPauseButton.innerHTML = '⏸' : this.playPauseButton.innerHTML = '⏵';;
	}
}
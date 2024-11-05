import { Loader } from './Loader.js';
export class Viewer {
	constructor(contentFolder, parentElement, loader = null) {
		this.loader = loader || new Loader(contentFolder);
		this.parentElement = parentElement;
		this.createDescriptionPanel();
		this.createAnimControls();
	}
	
	// Actualizar la descripción y los controles
	updateDescription(description, backgroundColor) {
		const descriptionDiv = document.querySelector("#description-panel");
		if (descriptionDiv) {
			descriptionDiv.innerHTML = description.replace(/\n/g, '<br>');
			descriptionDiv.style.color = backgroundColor;
			document.getElementById("toggle-button").style.color = backgroundColor;
			document.getElementById("pause-button").style.color = backgroundColor;
		}
	}
	
	// Crear y añadir el panel de descripción
	createDescriptionPanel() {
		let descriptionPanel = document.createElement('div');
		descriptionPanel.id = 'description-panel';
		descriptionPanel.style.display = 'none';
		this.parentElement.appendChild(descriptionPanel);

		// Crear y añadir el botón de mostrar/ocultar
		let toggleButton = document.createElement('button');
		toggleButton.id = 'toggle-button';
		toggleButton.innerText = '\u2261';
		toggleButton.addEventListener('click', () => {
			if (descriptionPanel.style.display === 'none') {
				descriptionPanel.style.display = 'block';
				descriptionPanel.offsetHeight;
				descriptionPanel.style.filter = 'invert(100%)'
			} else {
				descriptionPanel.style.display = 'none';
			}
		});
		this.parentElement.appendChild(toggleButton);
	}
	
	// Método que aplica la configuración de cada medio a la visualización
	applyConfig(contentName) {
		const config = this.loader.configs[contentName];
		// Mostrar la descripción en el HTML
		this.updateDescription(config.description, config.backgroundColor);
		return config;
	}
	
	// Crear y añadir los controles de reproducción
	createAnimControls() {
		this.pauseButton = document.createElement('button');
		this.pauseButton.id = 'pause-button';
		this.pauseButton.innerHTML = '⏸';
		this.parentElement.appendChild(this.pauseButton);
		this.isPaused = false;
		
		// Alternar la animación al hacer clic en el botón
		this.pauseButton.addEventListener('click', () => this.toggleAnimationPause());

		// Alternar con la tecla Espacio
		window.addEventListener('keydown', (event) => {
			if (event.code === 'Space') {
				this.toggleAnimationPause();
			}
		});
	}
	
	// Método para alternar la pausa/reproducción
	toggleAnimationPause() {
		throw new Error("toggleAnimationPause() no implementado.");
	}
	
	// Modificar el botón de pausa según el estado
	togglePauseButtonIcon(paused) {
		paused ? this.pauseButton.innerHTML = '⏸' : this.pauseButton.innerHTML = '⏵';;
	}
}
import { Loader } from './Loader.js';
export class Viewer {
	constructor(parentElement, loader = null, {
			orientation = "bottom",
			appendControls = true, 
			controls = null
		} = {}) {
		this.loader = loader;
		this.parentElement = parentElement;
		
		this.viewerElement = document.createElement("div");
		this.viewerElement.className = "viewer " + orientation;
		this.parentElement.appendChild(this.viewerElement);
		
		this.appendControls = appendControls;
		
		this.createDescriptionPanel();
		
		// Validar controles o crear nuevos si no son válidos
		if (controls && this.validateControls(controls)) {
			this.mediaControls = controls;
		} else {
			this.mediaControls = this.createControls();
		}
		
		//this.createAnimControls();
		
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
	
	#validateControls(controls) {
		// Lista de controles requeridos
		const requiredControls = ["playPause", "toggleDescription", "reset", "changeAnimation"];

		// Verificar si el objeto tiene todas las claves necesarias
		const hasAllControls = requiredControls.every(control => 
			controls.hasOwnProperty(control) && 
			typeof controls[control] === "object" &&
			controls[control].button instanceof HTMLElement &&
			typeof controls[control].action === "function"
		);

		if (!hasAllControls) {
			console.error("El objeto controls no es válido:", controls);
		}

		return hasAllControls;
	}
	
	createUniqueElement(tag, selector) {
		let element = document.querySelector(selector);
		if (!element) {
			element = document.createElement(tag);
			if (selector.startsWith('#')) {
				element.id = selector.slice(1);
			} else if (selector.startsWith('.')) {
				let classes = selector.slice(1).split('.');
				element.classList.add(...classes);
			}
		}
		return element;
	}
	
	appendIfNeeded(parentElement, childElement) {
		if (this.appendControls) {
			parentElement.appendChild(childElement);
		}
	}
	
	// Actualizar los action y los updateAppearance de los controles por los métodos propios
	setActive(isActive){
		this.isActive = isActive;
		if (isActive) {
			this.mediaControls.playPause.action = () => this.toggleAnimationPause();
			this.mediaControls.playPause.updateAppearance = (paused) => this.togglePauseButtonIcon(paused);
			this.mediaControls.toggleDescription.action = () => this.toggleDescriptionPanel();
			//No hay cambios en el botón para el toggleDescription
			this.mediaControls.reset.action = () => this.reset();
			//No hay cambios en el botón para el reset
			//this.mediaControls.changeAnimation.updateAppearance = this.CREAR_METODO;
			//this.mediaControls.changeAnimation.action = this.CREAR_METODO;
		}
	}
	
	selectControls(controlsConfig = {}) {
		// Valores por defecto: deshabilitar todos los controles
		const defaultConfig = Object.keys(this.mediaControls).reduce((config, controlName) => {
			config[controlName] = false;
			return config;
		}, {});

		// Mezclar configuración predeterminada con la personalizada
		const finalConfig = { ...defaultConfig, ...controlsConfig };

		// Aplicar la configuración a los botones
		Object.keys(this.mediaControls).forEach((controlName) => {
			const control = this.mediaControls[controlName];
			if (finalConfig[controlName]) {
				control.button.style.display = "block";
			} else {
				control.button.style.display = "none";
			}
		});
	}
	
	resize() {}
	
	setLoader(loader) {
		this.loader = loader;
	}
	
	// Actualizar la descripción y los controles --> TODO: dividir
	updateDescription(description, backgroundColor) {
		const descriptionDiv = document.querySelector(".description-panel");
		if (descriptionDiv) {
			descriptionDiv.innerHTML = description.replace(/\n/g, '<br>');
			descriptionDiv.style.color = backgroundColor;
			this.mediaControls.toggleDescription.button.style.color = backgroundColor;
			//this.playPauseButton.style.color = backgroundColor;
		}
		Object.keys(this.mediaControls).forEach((controlName) => {
			const control = this.mediaControls[controlName];
			control.button.style.color = backgroundColor;
		});
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
	}
	
	// Método que aplica la configuración de cada medio a la visualización
	applyConfig(contentName) {
		const config = this.loader.configs[contentName];
		// Mostrar la descripción en el HTML
		this.updateDescription(config.description, config.backgroundColor);
		this.domElement.style.backgroundColor = config.backgroundColor;
		return config;
	}
	
	createControls() {
		const controls = {
			playPause: {
				button: "button",
				action: () => console.warn("Sin visor activo para pausar/reproducir."),
				key: "Space",
				icon: ['⏸', '⏵'],
				updateAppearance: () => console.warn("Sin visor activo para actualizar apariencia del botón de pausa."),
				align: "left"
			},
			toggleDescription: {
				button: "button",
				action: () => console.warn("Sin visor activo para mostrar descripción."),
				key: "KeyD",
				icon: ["ℹ"],
				updateAppearance: () => console.warn("Sin visor activo para actualizar apariencia del botón de descripción."),
				align: "right"
			},
			reset: {
				button: "button",
				action: () => console.warn("Sin visor activo para resetear cámara."),
				key: "KeyR",
				icon: ["⭮"],
				// No necesita updateAppearance inicialmente
				align: "left"
				
			},
			changeAnimation: {
				button: "select",
				action: () => console.warn("Sin visor activo para cambiar animación."),
				key: "KeyA",
				icon: ["⏭"],
				updateAppearance: () => console.warn("Sin visor activo para actualizar apariencia del botón de animación."),
				align: "left"
			}
			/*futuros botones: 	⛝ -> para resetear zoom y pan
								⛶ -> para pantalla completa*/
		};

		const controlContainer = this.createUniqueElement("div", ".control-container");
		this.appendIfNeeded(this.parentElement, controlContainer);
		
		const leftContainer = this.createUniqueElement("div", ".control-container-left");
		const rightContainer = this.createUniqueElement("div", ".control-container-right");
		
		controlContainer.appendChild(leftContainer);
		controlContainer.appendChild(rightContainer);

		Object.keys(controls).forEach((controlName) => {
			const control = controls[controlName];

			if (control.button === "button") {
				// Crear botón con createUniqueElement
				control.button = this.createUniqueElement("button", `.control-button.${controlName}`);
				control.button.innerHTML = control.icon[0]; // Asignar el icono visual
				// Asociar acción al clic
				control.button.addEventListener("click", () => control.action());
				// Asociar acción a la tecla
				window.addEventListener("keydown", (event) => {
					if (event.code === control.key) {
						event.preventDefault();
						control.action();
					}
				});
			} else if (control.button === "select") {
				control.button = this.createUniqueElement("select", `.control-dropdown.${controlName}`);
				
				// Agregar un placeholder como opción inicial
				const placeholderOption = document.createElement("option");
				placeholderOption.value = "";
				placeholderOption.textContent = control.icon;
				placeholderOption.disabled = true;
				placeholderOption.selected = true;
				control.button.appendChild(placeholderOption);
				
				control.button.addEventListener("change", (event) => control.action(event.target.value));
			}
			
			// Añadir botón al subcontenedor correspondiente
			if (control.align === "left") {
				leftContainer.appendChild(control.button);
			} else if (control.align === "right") {
				rightContainer.appendChild(control.button);
			}
		});

		return controls;
	}
	
	// Método para alternar la pausa/reproducción
	toggleAnimationPause() {}
	
	// Modificar el botón de pausa según el estado
	togglePauseButtonIcon(paused) {
		if (paused) {
			this.mediaControls.playPause.button.innerHTML = this.mediaControls.playPause.icon[0];
		} else {
			this.mediaControls.playPause.button.innerHTML = this.mediaControls.playPause.icon[1];
		}
	}
	
	toggleDescriptionPanel(){
		if (this.isActive) {
			if (this.descriptionPanel.style.display === 'none') {
				this.descriptionPanel.style.display = 'block';
				this.descriptionPanel.offsetHeight;
				this.descriptionPanel.style.filter = 'invert(100%)'
			} else {
				this.descriptionPanel.style.display = 'none';
			}
		}
	}
	
	reset () {}
}
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

import { Loader } from './Loader.js';
export class Viewer {
	constructor(parentElement, loader = null, {
			orientation = "bottom",
			appendControls = true, 
			controls = null,
			language = "es",
			upperParent = null
		} = {}) {
		this.loader = loader;
		this.parentElement = parentElement;
		
		if (upperParent) {
				this.upperParent = upperParent;
		} else {
			this.upperParent = this.parentElement;
			this.upperParent.style.setProperty("--viewer-color", "black");
		}		
		
		this.viewerElement = document.createElement("div");
		this.viewerElement.className = "viewer " + orientation;
		this.parentElement.appendChild(this.viewerElement);
		
//console.log(this.upperParent, this.constructor.name);
		
		this.language = language;
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
		let element = this.upperParent.querySelector(selector);
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
	
	// Actualizar los action y los update de los controles por los métodos propios
	setActive(isActive) {
		this.isActive = isActive;	
		if (isActive) {
			// Asociar las acciones con bind
			this.mediaControls.playPause.action = this.toggleAnimationPause.bind(this);
			this.mediaControls.playPause.update = this.togglePauseButtonIcon.bind(this);

			this.mediaControls.toggleDescription.action = this.toggleDescriptionPanel.bind(this);
			// No hay cambios en el botón para el toggleDescription

			this.mediaControls.reset.action = this.reset.bind(this);
			// No hay cambios en el botón para el reset

			this.mediaControls.changeAnimation.action = this.changeAnimation.bind(this);
			// No hay cambios en el select para el changeAnimation

			this.mediaControls.resetView.action = this.resetView.bind(this);
			this.mediaControls.resetView.update = this.toggleResetViewButtonIcon.bind(this);

			this.mediaControls.fullScreen.action = this.toggleFullScreen.bind(this);
			this.mediaControls.fullScreen.update = this.toggleFullScreenButtonIcon.bind(this);
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

	updateLanguage(selectedLang = this.language) {
		this.language = selectedLang;
		const allTextElements = this.descriptionPanel.querySelectorAll('*[class^="text-"]');

		allTextElements.forEach(textElement => {
			if (textElement.classList.contains(`text-${selectedLang}`)) {
				textElement.style.display = 'inline';
			} else {
				textElement.style.display = 'none';
			}
		});
	}

	resize() {}
	
	// Establecer el loader al indicado
	setLoader(loader) {
		this.loader = loader;
	}
	
	// Actualizar la descripción y los controles
	updateDescription(description) {
		if (this.descriptionPanel) {
			const panel = this.descriptionPanel;
			
			// Establece el contenido directamente desde el JSON (añadiendo etiquetas para los saltos de linea)
			if (description) {
				panel.innerHTML = description.replace(/\n/g, '<br>');
			} else {
				panel.innerHTML = "";
			}
			panel.offsetHeight;
			this.updateLanguage();
		}
	}
	
	//Actualizar una variable css que contiene un color que podría usarse en múltiples estilos
	updateColors(color) {
		const root = document.documentElement;
		//root.style.setProperty('--shared-color', color);
		this.upperParent.style.setProperty("--viewer-color", color);

		document.body.offsetHeight; // Forzamos un reflujo para aplicar el color a los estilos que lo utilicen
	}
	
	// Crear y añadir el panel de descripción
	createDescriptionPanel() {
		this.descriptionPanel = this.createUniqueElement('div', '.description-panel');
		this.descriptionPanel.style.display = 'none';
		this.appendIfNeeded(this.parentElement, this.descriptionPanel);
		
		this.descriptionPanel.addEventListener('wheel', (e) => {
			e.stopPropagation();
			this.descriptionPanel.scrollBy(0, e.deltaY);
		}, { passive: false });
	}
	
	saveConfig(contentName) {}
	
	// Método que aplica la configuración de cada medio a la visualización
	applyConfig(contentName) {
		const config = this.loader.configs[contentName];
		// Mostrar la descripción en el HTML
		this.updateDescription(config.description);
		this.updateColors(config.backgroundColor);
		return config;
	}
	
	createControls() {
		const controls = {
			playPause: {
				button: "button",
				action: () => console.warn("Sin visor activo para pausar/reproducir."),
				key: "Space",
				icon: ['⏸', '⏵'],
				update: () => console.warn("Sin visor activo para actualizar apariencia del botón de pausa."),
				align: "left"
			},
			toggleDescription: {
				button: "button",
				action: () => console.warn("Sin visor activo para mostrar descripción."),
				key: "KeyD",
				icon: ["ℹ"],
				update: () => console.warn("Sin visor activo para actualizar apariencia del botón de descripción."),
				align: "right"
			},
			reset: {
				button: "button",
				action: () => console.warn("Sin visor activo para resetear cámara."),
				key: "KeyR",
				icon: ["⭮"],
				// No necesita update inicialmente
				align: "left"
				
			},
			resetView: {
				button: "button",
				action: () => console.warn("Sin visor activo para resetear la vista."),
				key: "KeyV",
				icon: ["⇱"],
				update: () => console.warn("Sin visor activo para actualizar apariencia del botón de animación."),
				align: "left"
			}, 
			fullScreen: {
				button: "button",
				action: () => console.warn("Sin visor activo para escalar a pantalla completa."),
				key: "KeyF",
				icon: ["⛶","🗔"],
				update: () => console.warn("Sin visor activo para actualizar apariencia del botón de pantalla completa."),
				align: "left"
			},
			changeAnimation: {
				button: "select",
				action: () => console.warn("Sin visor activo para cambiar animación."),
				key: "KeyA",
				icon: ["⏭"],
				// No necesita update inicialmente
				align: "left"
			}
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
				control.button.addEventListener("click", () => {
					if (this.isActive) {
						control.action();
					}
				});
				// Asociar acción a la tecla
				window.addEventListener("keydown", (event) => {
					if (event.code === control.key) {
						if (this.isActive) {
							event.preventDefault();
							control.action();
						}
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
				// Asociar acción al cambio de selección
				control.button.addEventListener("change", (event) => {
					if (this.isActive) {
						control.action(event);
					}
				});
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
			this.mediaControls.playPause.button.classList.add("pause");
			this.mediaControls.playPause.button.classList.remove("play");
		} else {
			this.mediaControls.playPause.button.innerHTML = this.mediaControls.playPause.icon[1];
			this.mediaControls.playPause.button.classList.add("play");
			this.mediaControls.playPause.button.classList.remove("pause");
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
	resetView () {}
	toggleResetViewButtonIcon() {}
	toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error al intentar entrar en pantalla completa: ${err.message}`);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.error(`Error al intentar salir de pantalla completa: ${err.message}`);
            });
        }
    }
	toggleFullScreenButtonIcon(screenIsFull) {}
	changeAnimation(){}
}
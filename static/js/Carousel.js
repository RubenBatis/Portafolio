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
export class Carousel {
	constructor(parentElement, {
		maxThumbsToShow = 0,
		viewer = null,
		loader = null,
		/*linkedCarousel = null,*/
		position = "bottom", // Valores: 'left', 'right', 'top', 'bottom', 
		append = true
	} = {}) {
		this.parentElement = parentElement;
		this.viewer = viewer;
		this.maxThumbsToShow = maxThumbsToShow;
		this.position = position;
		this.append = append;
		
		this.loader = this.viewer.loader;
		this.currentLoader = this.loader;
		this.currentItemIndex = viewer ? viewer.currentItemIndex : {value: 0};
		
		// Esperar a que viewer3D y el Loader estén listos
		this.ready = new Promise((resolve, reject) => {
			// Esperar a que viewer3D y el Loader estén listos
			Promise.all([this.viewer.ready, this.viewer.loader.ready]).then(() => {
                try {
                    this.#createThumbnailContainer();
					this.#addWheelEvent();
                    this.#updateThumbnailsDisplay();
                    this.#addClickEvents();

                    window.addEventListener('resize', () => {
                        this.#updateThumbnailsDisplay();
                    });

                    resolve(); // Indica que el carrusel está completamente inicializado
                } catch (error) {
                    console.error("Error durante la inicialización del carrusel:", error);
                    reject(error); // Indica que hubo un error durante la inicialización
                }
            })
            .catch(error => {
                console.error("Error al esperar a viewer.ready o loader.ready:", error);
                reject(error); // Indica que hubo un error en las dependencias
            });
		});
	}
	
	// Asignar un loader nuevo
	setLoader(loader) {
		this.currentLoader = loader;
        this.currentItemIndex.value = 0; // Reiniciar índice al cambiar el loader
        this.#updateThumbnailsDisplay();
	}
	
	// Calcular número de thumbnails a mostrar:
	#calculateThumbnailsCount(container, max) {
		let style = window.getComputedStyle(container)
		let numItems = this.currentLoader.thumbnails.length;
		let dimension = ['top', 'bottom'].includes(this.position) ? parseFloat(style.width) : parseFloat(style.height);
		let thumbnailSize = ['top', 'bottom'].includes(this.position) ? parseFloat(style.height) : parseFloat(style.width);

		let amount = Math.floor(dimension / thumbnailSize);
		// Si hay más que el máximo configurado, se mostrará solo el máximo
		if (max != 0 && amount > max) {
			amount = max;
		}
		// Si hay más que el número de elementos en el array, se reduce
		if (amount > numItems) {
			amount = numItems;
		}
		// Si el número es par, se reduce en uno
		if (amount % 2 === 0) {
			amount -= 1;
		}
		this.thumbnailsCount = amount;
		this.thHalfCount = Math.floor(this.thumbnailsCount / 2); // Mitad de thumbnails visibles a cada lado del centro
	}
	
	// Crear contenedor de miniaturas
	#createThumbnailContainer() {
		this.thumbnailContainer = document.createElement('div');
		this.thumbnailContainer.className = `thumbnail-container ${this.position}`;
		if (this.append) {
			this.parentElement.appendChild(this.thumbnailContainer);
		}
	}
	
	// Añadir evento de la rueda al ThumbnailContainer
	#addWheelEvent() {
		this.thumbnailContainer.addEventListener('wheel', this.handleWheelEvent.bind(this), { passive: false });
		this.thumbnailContainer.addEventListener('DOMMouseScroll', this.handleWheelEvent.bind(this), { passive: false });
		this.thumbnailContainer.addEventListener('MozMousePixelScroll', this.handleWheelEvent.bind(this), { passive: false });
	}
	
	handleWheelEvent(event) {
		event.preventDefault();
		event.stopPropagation();
		
		let contentNumber;
		if (event.deltaY > 0) {
			contentNumber = (this.currentItemIndex.value + 1) % this.currentLoader.resourceNames.length;
		} else {
			contentNumber = (this.currentItemIndex.value - 1 + this.currentLoader.resourceNames.length) % this.currentLoader.resourceNames.length;
		}
		this.changeContent(contentNumber);
		return false;
	}

	// Añadir eventos de click a los thumbnails
	#addClickEvent(thumbnailElement, thumbnailIndex) {
		thumbnailElement.setAttribute("data-thumbnumber", thumbnailIndex);
		thumbnailElement.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			const contentNumber = parseInt(event.currentTarget.getAttribute("data-thumbnumber"), 10);
			this.changeContent(contentNumber);
		});
	}
	
	#addClickEvents() {
		this.currentLoader.thumbnails.forEach((thumbnailElement, thumbnailIndex) => {
			this.#addClickEvent(thumbnailElement, thumbnailIndex);
		});
	}
	
	// Crear y añadir los botones laterales
	#createNavigationButtons() {
		const previousArrow = this.thumbnailContainer.querySelector('.arrow.left, .arrow.top');
		const nextArrow = this.thumbnailContainer.querySelector('.arrow.right, .arrow.bottom');
		const horizontal = ['top', 'bottom'].includes(this.position);

		if (!previousArrow) {
			const newLeftArrow = document.createElement('div');
			newLeftArrow.className = horizontal ? 'arrow left' : 'arrow top';
			newLeftArrow.innerHTML = horizontal ? "\u2329" : '\uFE3F'; // Unicode para la flecha izquierda o superior
			newLeftArrow.setAttribute('tabindex', '-1');
			newLeftArrow.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				let contentNumber = (this.currentItemIndex.value - 1 + this.currentLoader.resourceNames.length) % this.currentLoader.resourceNames.length;
				this.changeContent(contentNumber);
			});
			this.thumbnailContainer.appendChild(newLeftArrow);
		}

		if (!nextArrow) {
			const newRightArrow = document.createElement('div');
			newRightArrow.className = horizontal ? 'arrow right' : 'arrow bottom';
			newRightArrow.innerHTML = horizontal ? "\u232A" : '\uFE40'; // Unicode para la flecha derecha o inferior
			newRightArrow.setAttribute('tabindex', '-1');
			newRightArrow.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				let contentNumber = (this.currentItemIndex.value + 1) % this.currentLoader.resourceNames.length;
				this.changeContent(contentNumber);
			});
			this.thumbnailContainer.appendChild(newRightArrow);
		}
	}
	
	//Modificar el color superior del degradado de fondo del thumbnailContainer /*mejor que dependa de la clase, pero ya lo haré*/
	/*updateThumbnailsBackground(backgroundColor) {
		if (this.thumbnailContainer) {
			this.thumbnailContainer.style.background = `linear-gradient(to ${this.position}, ${backgroundColor}, transparent)`;
		}
	}*/

	//Función a llamar desde los eventos que cambien el contenido
	changeContent(contentNumber) {
		if (typeof this.viewer.applyConfig === 'function') {
			this.viewer.saveConfig(this.currentLoader.resourceNames[this.currentItemIndex.value]);
			this.currentItemIndex.value = contentNumber;
			this.viewer.applyConfig(this.currentLoader.resourceNames[this.currentItemIndex.value]);
			this.#updateThumbnailsDisplay();
		} else {
			if (this.loader.children[contentNumber]) {		
				this.setLoader(this.loader.children[contentNumber])
			}
		}
	}

	// Función para obtener los thumbnails visibles
	#getVisibleThumbnails() {
		const visibleThumbnails = [];
				
		// Rellenar el arreglo de miniaturas visibles de forma circular
		for (let i = -this.thHalfCount; i <= this.thHalfCount; i++) {
			const index = (this.currentItemIndex.value + i + this.currentLoader.thumbnails.length) % this.currentLoader.thumbnails.length;
			visibleThumbnails.push(this.currentLoader.thumbnails[index]);
		}
		return visibleThumbnails;
	}

	// Función para actualizar el display del carrusel de thumbnails
	#updateThumbnailsDisplay() {
		this.#calculateThumbnailsCount(this.thumbnailContainer, this.maxThumbsToShow);
		const visibleThumbnails = this.#getVisibleThumbnails();

		this.thumbnailContainer.innerHTML = "";  // Limpiar el contenedor
		// Añadir las miniaturas visibles y aplicar clases activas
		visibleThumbnails.forEach((thumbnail, index) => {

			thumbnail.classList.remove('current-thumbnail');
			
			// Configurar el thumbnail centrado como activo
			if (index === this.thHalfCount) {
				thumbnail.classList.add('current-thumbnail');
			}
			this.thumbnailContainer.appendChild(thumbnail);
		});

		// Añadir los botones de navegación si aún no están
		this.#createNavigationButtons();
	}
}
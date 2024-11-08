import { Viewer } from './Viewer.js';
export class Carousel {
	constructor(viewer, parentElement, maxThumbsToShow = 0) {
		this.parentElement = parentElement;
		this.viewer = viewer;
		this.maxThumbsToShow = maxThumbsToShow;
		
		// Esperar a que viewer3D y el Loader estén listos
        Promise.all([this.viewer.ready, this.viewer.loader.ready]).then(() => {
            this.#createThumbnailContainer();
            this.#updateThumbnailsDisplay();
            this.#addWheelEvent();
			this.#addClickEvents();
			
			window.addEventListener('resize', () => {
				this.#updateThumbnailsDisplay();
			});

        }).catch(error => {
			console.error("Error en la inicialización del carrusel:", error);
		});
	}
	
	// Calcular número de thumbnails a mostrar:
	#calculateThumbnailsCount(container, max) {
		let style = window.getComputedStyle(container)
		let width = parseFloat(style.width);
		let height = parseFloat(style.height);
		let numItems = this.viewer.loader.thumbnails.length;
		
		let amount = Math.floor(width / height);
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
			amount -= -1;
		}
		this.thumbnailsCount = amount;
		this.thHalfCount = Math.floor(this.thumbnailsCount / 2); // Mitad de thumbnails visibles a cada lado del centro
	}
	
	// Crear contenedor de miniaturas
	#createThumbnailContainer() {
		this.thumbnailContainer = document.createElement('div');
		this.thumbnailContainer.className = 'thumbnail-container';
		this.parentElement.appendChild(this.thumbnailContainer);
	}
	
	// Añadir evento de la rueda al ThumbnailContainer
	#addWheelEvent() {
		this.thumbnailContainer.addEventListener('wheel', (event) => {
			let ContentNumber;
			if (event.deltaY > 0) {
				ContentNumber = (this.viewer.currentItemIndex.value + 1) % this.viewer.loader.resourceNames.length;
			} else {
				ContentNumber = (this.viewer.currentItemIndex.value - 1 + this.viewer.loader.resourceNames.length) % this.viewer.loader.resourceNames.length;
			}
				this.#changeContent(ContentNumber);
		}, { passive: true });
	}

	// Añadir eventos de click a los thumbnails
	#addClickEvent(thumbnailElement, thumbnailIndex) {
		thumbnailElement.setAttribute("data-thumbnumber", thumbnailIndex);
		thumbnailElement.addEventListener("click", (event) => {
			const ContentNumber = parseInt(event.currentTarget.getAttribute("data-thumbnumber"), 10);
			this.#changeContent(ContentNumber);
		});
	}
	
	#addClickEvents() {
		this.viewer.loader.thumbnails.forEach((thumbnailElement, thumbnailIndex) => {
			this.#addClickEvent(thumbnailElement, thumbnailIndex);
		});
	}
	
	// Crear y añadir los botones laterales
	#createNavigationButtons() {
		const leftArrow = document.querySelector('.arrow.left');
		const rightArrow = document.querySelector('.arrow.right');

		if (!leftArrow) {
			const newLeftArrow = document.createElement('div');
			newLeftArrow.className = 'arrow left';
			newLeftArrow.innerHTML = "\u2329"; // Unicode para la flecha izquierda
			newLeftArrow.addEventListener('click', () => {
				let ContentNumber = (this.viewer.currentItemIndex.value - 1 + this.viewer.loader.resourceNames.length) % this.viewer.loader.resourceNames.length;
				this.#changeContent(ContentNumber);
			});
			this.thumbnailContainer.appendChild(newLeftArrow);
		}

		if (!rightArrow) {
			const newRightArrow = document.createElement('div');
			newRightArrow.className = 'arrow right';
			newRightArrow.innerHTML = "\u232A"; // Unicode para la flecha derecha
			newRightArrow.addEventListener('click', () => {
				let ContentNumber = (this.viewer.currentItemIndex.value + 1) % this.viewer.loader.resourceNames.length;
				this.#changeContent(ContentNumber);
			});
			this.thumbnailContainer.appendChild(newRightArrow);
		}
	}
	
	//Modificar el color superior del degradado de fondo del thumbnailContainer
	updateThumbnailsBackground(backgroundColor) {
		if (this.thumbnailContainer) {
			this.thumbnailContainer.style.background = `linear-gradient(${backgroundColor}, transparent)`;
		}
	}

	//Función a llamar desde los eventos que cambien el contenido
	#changeContent(ContentNumber) {
		this.viewer.saveConfig(this.viewer.loader.resourceNames[this.viewer.currentItemIndex.value]);
		this.viewer.currentItemIndex.value = ContentNumber;

		this.viewer.applyConfig(this.viewer.loader.resourceNames[this.viewer.currentItemIndex.value]);
		this.#updateThumbnailsDisplay();
	}

	// Función para obtener los thumbnails visibles
	#getVisibleThumbnails() {
		const visibleThumbnails = [];
				
		// Rellenar el arreglo de miniaturas visibles de forma circular
		for (let i = -this.thHalfCount; i <= this.thHalfCount; i++) {
			const index = (this.viewer.currentItemIndex.value + i + this.viewer.loader.thumbnails.length) % this.viewer.loader.thumbnails.length;
			visibleThumbnails.push(this.viewer.loader.thumbnails[index]);
		}
		return visibleThumbnails;
	}

	// Función para actualizar el display del carrusel de thumbnails
	#updateThumbnailsDisplay() {
		this.#calculateThumbnailsCount(this.thumbnailContainer, this.maxThumbsToShow);
		const visibleThumbnails = this.#getVisibleThumbnails();
		//const thumbnailContainer = document.getElementById("thumbnail-container");
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

		//actualizar el color de fondo del div de thumbnails
		this.updateThumbnailsBackground(this.viewer.loader.configs[this.viewer.loader.resourceNames[this.viewer.currentItemIndex.value]].backgroundColor);

		// Añadir los botones de navegación si aún no están
		this.#createNavigationButtons();
	}
}
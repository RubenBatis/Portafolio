import { Viewer } from './Viewer.js';
export class Carousel {
	constructor(parentElement, {
		maxThumbsToShow = 0,
		viewer = null,
		loader = null,
		linkedCarousel = null,
		position = "bottom" // Valores: 'left', 'right', 'top', 'bottom'
	} = {}) {
		this.parentElement = parentElement;
		this.viewer = viewer;
		this.maxThumbsToShow = maxThumbsToShow;
		this.position = position;
		
		this.loader = this.viewer.loader; /// ¿porqué esto fuera del ready y lo otro dentro? Excelente pregunta.
		this.currentLoader = this.loader;
		this.currentItemIndex = viewer ? viewer.currentItemIndex : {value: 0};
		
		this.linkedCarousel = linkedCarousel;// instanceof Carousel ? linkedCarousel : null;
		
		// Esperar a que viewer3D y el Loader estén listos
        Promise.all([this.viewer.ready, this.viewer.loader.ready]).then(() => {
            this.#createThumbnailContainer();
            this.#updateThumbnailsDisplay();
            this.#addWheelEvent();
			this.#addClickEvents();
			
			if (loader) {
				this.loader = loader; /// ¿porqué esto dentro del ready y lo otro fuera? Excelente pregunta.
				this.currentLoader = this.loader;
			}
			
			window.addEventListener('resize', () => {
				this.#updateThumbnailsDisplay();
			});

        }).catch(error => {
			console.error("Error en la inicialización del carrusel:", error);
		});
	}
	
	// Asignar un loader nuevo
	setLoader(loader) {
		this.currentLoader = loader;
        this.currentItemIndex = 0; // Reiniciar índice al cambiar el loader
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
			amount -= -1;
		}
		this.thumbnailsCount = amount;
		this.thHalfCount = Math.floor(this.thumbnailsCount / 2); // Mitad de thumbnails visibles a cada lado del centro
	}
	
	// Crear contenedor de miniaturas
	#createThumbnailContainer() {
		this.thumbnailContainer = document.createElement('div');
		this.thumbnailContainer.className = `thumbnail-container ${this.position}`;
		this.parentElement.appendChild(this.thumbnailContainer);
	}
	
	// Añadir evento de la rueda al ThumbnailContainer
	#addWheelEvent() {
		this.thumbnailContainer.addEventListener('wheel', (event) => {
			event.preventDefault();
			let contentNumber;
			if (event.deltaY > 0) {
				contentNumber = (this.currentItemIndex.value + 1) % this.currentLoader.resourceNames.length;
			} else {
				contentNumber = (this.currentItemIndex.value - 1 + this.currentLoader.resourceNames.length) % this.currentLoader.resourceNames.length;
			}
				this.#changeContent(contentNumber);
		});//, { passive: true });
	}

	// Añadir eventos de click a los thumbnails
	#addClickEvent(thumbnailElement, thumbnailIndex) {
		thumbnailElement.setAttribute("data-thumbnumber", thumbnailIndex);
		thumbnailElement.addEventListener("click", (event) => {
			const contentNumber = parseInt(event.currentTarget.getAttribute("data-thumbnumber"), 10);
			this.#changeContent(contentNumber);
		});
	}
	
	#addClickEvents() {
		this.currentLoader.thumbnails.forEach((thumbnailElement, thumbnailIndex) => {
			this.#addClickEvent(thumbnailElement, thumbnailIndex);
		});
	}
	
	// Crear y añadir los botones laterales
	#createNavigationButtons() {
		const previousArrow = document.querySelector('.arrow.left, .arrow.top');
		const nextArrow = document.querySelector('.arrow.right, .arrow.bottom');
		const horizontal = ['top', 'bottom'].includes(this.position);

		if (!previousArrow) {
			const newLeftArrow = document.createElement('div');
			newLeftArrow.className = horizontal ? 'arrow left' : 'arrow top';
			newLeftArrow.innerHTML = horizontal ? "\u2329" : '\uFE3F'; // Unicode para la flecha izquierda
			newLeftArrow.addEventListener('click', () => {
				let contentNumber = (this.currentItemIndex.value - 1 + this.currentLoader.resourceNames.length) % this.currentLoader.resourceNames.length;
				this.#changeContent(contentNumber);
			});
			this.thumbnailContainer.appendChild(newLeftArrow);
		}

		if (!nextArrow) {
			const newRightArrow = document.createElement('div');
			newRightArrow.className = horizontal ? 'arrow right' : 'arrow bottom';
			newRightArrow.innerHTML = horizontal ? "\u232A" : '\uFE40'; // Unicode para la flecha derecha
			newRightArrow.addEventListener('click', () => {
				let contentNumber = (this.currentItemIndex.value + 1) % this.currentLoader.resourceNames.length;
				this.#changeContent(contentNumber);
			});
			this.thumbnailContainer.appendChild(newRightArrow);
		}
	}
	
	//Modificar el color superior del degradado de fondo del thumbnailContainer /*mejor que dependa de la clase, pero ya lo haré*/
	updateThumbnailsBackground(backgroundColor) {
		if (this.thumbnailContainer) {
			this.thumbnailContainer.style.background = `linear-gradient(to ${this.position}, ${backgroundColor}, transparent)`;
		}
	}

	//Función a llamar desde los eventos que cambien el contenido
	#changeContent(contentNumber) {
		if (typeof this.viewer.applyConfig === 'function') {
			this.viewer.saveConfig(this.currentLoader.resourceNames[this.currentItemIndex.value]);
			this.currentItemIndex.value = contentNumber;

			this.viewer.applyConfig(this.currentLoader.resourceNames[this.currentItemIndex.value]);
			this.#updateThumbnailsDisplay();
		} else {
			if (this.loader.children[contentNumber]) {
				this.currentLoader = this.loader.children[contentNumber];
				this.currentItemIndex = 0; // Reiniciar índice al cambiar el loader
				this.#updateThumbnailsDisplay();
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

		//actualizar el color de fondo del div de thumbnails
		this.updateThumbnailsBackground(this.currentLoader.configs[this.currentLoader.resourceNames[this.currentItemIndex.value]].backgroundColor);

		// Añadir los botones de navegación si aún no están
		this.#createNavigationButtons();
	}
}
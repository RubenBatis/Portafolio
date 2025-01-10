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

import { ContentViewer } from './ContentViewer.js';
import { Carousel } from './Carousel.js';
export class MediaPicker {
    constructor(contentFolder, parentElement) {
        this.parentElement = parentElement;

        // Crear el ContentViewer
        this.viewer = new ContentViewer(contentFolder, parentElement);

        // Carruseles
        this.carousels = [];
        this.carouselV = this.addCarousel('right');
        this.carouselH = this.addCarousel('bottom', this.carouselV);
    }
	
	waitForElement(conditionFn, timeout = 5000) {
		return new Promise((resolve, reject) => {
			const startTime = Date.now();

			const checkCondition = () => {
				if (conditionFn()) {
					resolve();
				} else if (Date.now() - startTime > timeout) {
					reject(new Error("Timeout waiting for element"));
				} else {
					setTimeout(checkCondition, 50); // Revisa la condición cada 50ms
				}
			};

			checkCondition();
		});
	}

    async addCarousel(pos, linkedCarousel = null) {
        const orientation = pos === 'top' || pos === 'bottom' ? 'horizontal' : 'vertical';

        const carousel = new Carousel(this.parentElement, {
            viewer: this.viewer,
            orientation: `${orientation}-${pos}`,
            linkedCarousel: linkedCarousel
        });

        await this.waitForElement(() => carousel.thumbnailContainer);
        await this.waitForElement(() => this.viewer.domElement);

        carousel.thumbnailContainer.classList.add(pos);
        this.placeCarousel(carousel, pos);
        this.carousels.push(carousel);

        this.adjustViewer();
        return carousel;
    }

    placeCarousel(carousel, pos) {
        const topOffset = this.carousels.filter(c => c.thumbnailContainer.classList.contains('top')).length * 20;
        const bottomOffset = this.carousels.filter(c => c.thumbnailContainer.classList.contains('bottom')).length * 20;
        const leftOffset = this.carousels.filter(c => c.thumbnailContainer.classList.contains('left')).length * 20;
        const rightOffset = this.carousels.filter(c => c.thumbnailContainer.classList.contains('right')).length * 20;

        switch (pos) {
            case 'top':
                this.viewer.domElement.style.top = `${topOffset}%`;
                break;
            case 'bottom':
                this.viewer.domElement.style.bottom = `${bottomOffset}%`;
                break;
            case 'left':
                this.viewer.domElement.style.left = `${leftOffset}%`;
                break;
            case 'right':
                this.viewer.domElement.style.right = `${rightOffset}%`;
                break;
        }

        this.viewer.domElement.style.height = `${100 - topOffset - bottomOffset}%`;
        this.viewer.domElement.style.width = `${100 - leftOffset - rightOffset}%`;
        this.parentElement.appendChild(carousel.thumbnailContainer);
    }

    adjustViewer() {
        // Ajustar dimensiones del visor según la visibilidad de los carruseles
        this.viewer.domElement.style.top = `${this.getTotalOffset('top')}%`;
        this.viewer.domElement.style.bottom = `${this.getTotalOffset('bottom')}%`;
        this.viewer.domElement.style.left = `${this.getTotalOffset('left')}%`;
        this.viewer.domElement.style.right = `${this.getTotalOffset('right')}%`;
        this.viewer.domElement.style.height = `${100 - this.getTotalOffset('top') - this.getTotalOffset('bottom')}%`;
        this.viewer.domElement.style.width = `${100 - this.getTotalOffset('left') - this.getTotalOffset('right')}%`;
    }

    getTotalOffset(pos) {
        return this.carousels
            .filter(c => c.thumbnailContainer.classList.contains(pos) && c.thumbnailContainer.style.display !== 'none')
            .length * 20;
    }

    hideCarousels(selector) {
        document.querySelectorAll(selector).forEach(carousel => {
            carousel.style.display = carousel.style.display === 'none' ? 'block' : 'none';
        });
        this.adjustViewer();
    }

    handleFolderSelection(subLoader) {
        // Actualizar el carrusel secundario con el nuevo loader
        this.carouselH.setLoader(subLoader);
        this.carouselH.thumbnailContainer.style.display = 'block';

        // Mostrar el primer elemento de la subcarpeta
        const firstContent = subLoader.getFirstElement();
        if (firstContent) {
            this.viewer.showContent(firstContent);
        }
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
	window.scrollTo(0, 0);
	
	// Obtener referencias a los elementos necesarios
	const tabs = document.querySelectorAll('.tab');
	const contents = document.querySelectorAll('.content');
	const contentsContainer = document.querySelector('.contents');
	const tabsContainer = document.querySelector('.tabs');

	let currentIndex = 0;

	// Detectar el scroll en la columna de tabs para cambiar entre contenidos
	tabsContainer.addEventListener('wheel', (event) => {
		event.preventDefault();

		// Cambiar el índice según la dirección del scroll
		if (event.deltaY > 0 && currentIndex < contents.length - 1) {
			currentIndex++;
		} else if (event.deltaY < 0 && currentIndex > 0) {
			currentIndex--;
		}

		// Desplazar el contenido correspondiente a la vista
		contents[currentIndex].scrollIntoView({ behavior: "smooth", block: "start" });
		if (contents[currentIndex].viewerInstance) {
			contents[currentIndex].viewerInstance.refreshConfig();
		}
		
		/*let owntab = document.querySelector('a[href="#cat' + (currentIndex + 1)+'"]');
		tabs.forEach(tab => {tab.classList.remove("active");});
		owntab.classList.add("active");*/
		
	}, { passive: false });
	
	// Sobreescribir el evento de click de los anclas para evitar tenerlas en la URL
	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function (event) {
			event.preventDefault(); // Evita que el hash aparezca en la URL

			const targetId = this.getAttribute('href').substring(1); // Obtener el ID del ancla

			/*let owntab = document.querySelector('a[href="#' + targetId + '"]');
			tabs.forEach(tab => {tab.classList.remove("active");});
			owntab.classList.add("active");*/

			const targetElement = document.getElementById(targetId);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' }); // Desplazamiento suave
				if (targetElement.viewerInstance) targetElement.viewerInstance.refreshConfig();
			}
		});
	});
	
	// Configuración del IntersectionObserver
	const observerOptions = {
		root: null, // Observa en el viewport
		rootMargin: '0px',
		threshold: 0.5 // El 50% de la sección debe estar visible para activarla
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				// Actualizar currentIndex con la sección visible
				currentIndex = Array.from(contents).indexOf(entry.target);
				
				// Cuando una sección es visible, marca su pestaña como activa
				const targetId = entry.target.id;
				tabs.forEach(tab => {
					tab.classList.remove('active');
					if (tab.getAttribute('href') === `#${targetId}`) {
						tab.classList.add('active');
					}
				});
				
				// Llama a refreshConfig() del ContentViewer asociado a la sección visible
				if (entry.target.viewerInstance) {
					entry.target.viewerInstance.refreshConfig();
				}
			}
		});
	}, observerOptions);

	// Observa cada contenido
	contents.forEach(content => observer.observe(content));
});	


function configLanguageSelect() {
	const select = document.getElementById('languageSelect');
	const userLang = navigator.language || navigator.userLanguage;
	const lang = userLang.split('-')[0]; // Obtener el código de idioma (es, en, etc.)
	// Comprobar si el idioma está en las opciones del select
	const availableLanguages = Array.from(select.options).map(option => option.value);
	let finalLang;
	if (availableLanguages.includes(lang)) {
		select.value = finalLang = lang;
	} else {
		select.value = finalLang = 'es'; // Idioma por defecto si el idioma del navegador no está en las opciones
	}
	return finalLang;
}

export function createCategory(contentFolder, orientation, text = null) {
	// Contar el número de elementos con la clase "viewer-container"
	const viewerContainers = document.querySelectorAll('.viewer-container');
	const count = viewerContainers.length + 2; // Comenzar desde 2

	// Crear el div principal con clase "content" y id dinámico
	const outerDiv = document.createElement('div');
	outerDiv.className = 'content';
	outerDiv.id = `cat${count}`;

	// Crear el div interno con clase "viewer-container"
	const innerDiv = document.createElement('div');
	innerDiv.className = 'viewer-container';
	
	// Añadir el visor correspondiente al div interno
	let lang = configLanguageSelect();
	outerDiv["viewerInstance"] = new ContentViewer(innerDiv, {contentFolder: contentFolder, orientation: orientation, language: lang});

	// Añadir el div interno al div principal
	outerDiv.appendChild(innerDiv);

	// Modificar el href del último tab
	const tabs = document.querySelectorAll('.tab');
	const lastTab = tabs[tabs.length -1];
	const nextPosition = parseInt(lastTab.href.split('#')[1].replace(/\D/g, ''), 10) + 1;
	lastTab.href = "#cat" + nextPosition;
 
	// Modificar el id del último content
	const contents = document.querySelectorAll('.content');
	const lastContent = contents[contents.length -1];
	lastContent.id = "cat" + nextPosition;
 
	// Crear el elemento <a> con clase "tab" y href dinámico
	const tabLink = document.createElement('a');
	tabLink.className = 'tab';
	tabLink.href = `#cat${count}`;
	if (text) {
		//tabLink.textContent = name;
		tabLink.innerHTML = text;
	} else {
		//tabLink.textContent = `CATEGORÍA ${count}`;
		tabLink.innerHTML = `CATEGORÍA ${count}`;
	}

	// Añadir el elemento <a> en la penúltima posición del div con clase "tabs"
	const tabsDiv = document.querySelector('.tabs');
	if (tabsDiv) {
		const tabsChildren = tabsDiv.children;
		if (tabsChildren.length > 1) {
			tabsDiv.insertBefore(tabLink, tabsChildren[tabsChildren.length - 1]);
		} else {
			tabsDiv.appendChild(tabLink);
		}
	} else {
		console.error('No se encontró un div con la clase "tabs".');
	}

	// Añadir el div principal antes del último div con clase "content"
	if (lastContent) {
		lastContent.insertAdjacentElement('beforebegin', outerDiv);
	} else {
		console.error('No se encontró un div con la clase "content"');
	}

	// Devolver el div principal
	changeLanguage();
	return outerDiv;
}

// Selector de idioma
export function changeLanguage(viewers = []) {
	const select = document.getElementById('languageSelect');
	const selectedLanguage = select.value;
	// Ocultar todos los textos
	document.querySelectorAll('.text-es, .text-en').forEach(element => {
		element.style.display = 'none';
	});

	// Mostrar los textos del idioma seleccionado
	document.querySelectorAll(`.text-${selectedLanguage}`).forEach(element => {
		element.style.display = 'inline';
	});
	
	viewers.forEach(viewer => viewer.updateLanguage(selectedLanguage));
}


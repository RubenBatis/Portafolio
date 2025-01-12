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

import { GLTFLoader } from "GLTFLoader";
import { AnimationMixer, LoopRepeat } from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";

export class Loader {
	constructor(contentFolder) {
		this.resourceNames = [];
		this.thumbnails = [];
		this.configs = {};
		this.mixers = {};
		this.models = {};
		this.videos = {};
		this.images = {};
		this.animations = {};
		this.types = {};
		this.children = {}; 
		this.contentFolder = contentFolder;
		
		// Llama a la función de carga y asigna la promesa a `this.ready`
		this.ready = this.loadContentsFromJSON();
	}

	async #loadModel(modelFile) {
		return new Promise((resolve, reject) => {
			const gltfLoader = new GLTFLoader();
			gltfLoader.load(modelFile, (gltf) => {
				let modelName = modelFile.split('/').pop().split('.').slice(0, -1).join('.');
				this.models[modelName] = gltf.scene;
				this.animations[modelName] = gltf.animations;
														
				if (gltf.animations && gltf.animations.length > 0) {
					this.mixers[modelName] = new AnimationMixer(gltf.scene);
					gltf.animations.forEach((clip) => {
						const action = this.mixers[modelName].clipAction(clip);
						action.loop = LoopRepeat;
					});
				}
				resolve();
			}, undefined, (error) => {
				console.error(`Error al cargar el modelo: ${error}`);
				reject();
			});
		});
	}
	
	async #loadVideo(videoFile) {
		return new Promise((resolve, reject) => {
			// Crear el elemento de video
			const videoElement = document.createElement('video');
			videoElement.src = videoFile;

			videoElement.preload = 'auto'; // Pre-cargar el video para reducir el tiempo de carga cuando se use
			videoElement.muted = true;     // Silenciado por defecto para prevenir reproducción automática con sonido
			// Esperar a que los metadatos se carguen para saber que el video está listo
			videoElement.addEventListener('loadedmetadata', () => {
				let videoName = videoFile.split('/').pop().split('.').slice(0, -1).join('.');
				this.videos[videoName] = videoElement;
				resolve();
			});

			// Manejador de errores para capturar fallos en la carga
			videoElement.addEventListener('error', (event) => {
				console.error(`Error al cargar el video: ${event.message}`);
				reject();
			});
		});
	}
	
	async #loadImage(imageFile) {
		return new Promise((resolve, reject) => {
			// Crear el elemento de imagen
			const imageElement = document.createElement('img');
			imageElement.src = imageFile;
			imageElement.alt = 'Loaded Image'; // Añadir un atributo alt descriptivo

			// Esperar a que la imagen se cargue
			imageElement.onload = () => {
				let imageName = imageFile.split('/').pop().split('.').slice(0, -1).join('.');
				this.images[imageName] = imageElement;
				resolve();
			};

			// Manejador de errores para capturar fallos en la carga
			imageElement.onerror = (event) => {
				console.error(`Error al cargar la imagen: ${event.message}`);
				reject();
			};
		});
	}
	
	#loadThumbnail(thumbnailFile) {
		const thumbnailElement = document.createElement('img');
		thumbnailElement.className = "thumbnail";
		thumbnailElement.src = thumbnailFile;
		thumbnailElement.onerror = function(){
			this.onerror = null;
			this.src = "/static/assets/not_found.png";
		};	
		this.thumbnails.push(thumbnailElement);
	}

	async #listJSONFiles() {
		if (this.contentFolder) {
			try {
				const response = await fetch(`${this.contentFolder}`);
				//const response = await fetch(`${this.contentFolder}/${jsonFile}`);
				if (!response.ok) {
					throw new Error(`No se pudo cargar`);
				}
				const config = await response.json();
				return config;
			} catch (error) {
				console.error('Error fetching media:', error);
			}
		} else {
			return {};
		}
	}

	async loadContentsFromJSON() {
		if (!this.contentFolder) {
			return;
		}
		try {
			// Listar ficheros
			const allFiles = await this.#listJSONFiles();
			if (!allFiles || allFiles.length === 0) {
				//console.log("No se encontraron archivos en", this.contentFolder);
				return;
			}

			// Quedarme solo con los que acaben en .json
			const jsonFiles = allFiles.filter(f => f.endsWith(".json"));
			if (jsonFiles.length === 0) {
				//console.log("No hay ficheros .json válidos en", this.contentFolder);
				return;
			}

			// Leer (fetch) todos los JSON y guardarlos en un map (filename -> contenido)
			const fileContentMap = {};
			for (const fileName of jsonFiles) {
				const response = await fetch(`${this.contentFolder}/${fileName}`);
				const data = await response.json();
				fileContentMap[fileName] = data; // data puede ser array (múltiple) u objeto (simple)
			}

			// Construir el grafo (fichero -> ficheros referenciados) + inDegree
			const { graph, inDegree } = this.#buildGraph(fileContentMap);

			// Hacer el topological sort de los ficheros
			const sortedFiles = this.#topologicalSortFiles(graph, inDegree);

			// Separar “aislados” (que no refieren ni son referidos) que van al final
			const orderedFiles = this.#separateIsolatedAndNonIsolated(sortedFiles, graph, inDegree);

			// Procesar en ese orden
			await this.#processFilesInOrder(orderedFiles, fileContentMap);

			//console.log("Procesamiento completo de JSONs en orden topológico");
		} catch (error) {
			console.error("Error al cargar o procesar los JSONs:", error);
		}
	}

	#buildGraph(fileContentMap) {
		const graph = new Map();	// nombreFichero -> array de ficheros referenciados
		const inDegree = new Map(); // nombreFichero -> cuántos lo apuntan

		// Inicializar nodos
		for (const fileName of Object.keys(fileContentMap)) {
			graph.set(fileName, []);
			inDegree.set(fileName, 0);
		}

		// Rellenar aristas
		for (const [fileName, content] of Object.entries(fileContentMap)) {
			// Múltiple (array)
			if (Array.isArray(content)) {
				for (const item of content) {
					if (item.type === "json" && typeof item.resourceFile === "string") {
						const target = item.resourceFile;
						// Asegurar que si 'target' no estaba, se registra
						if (!graph.has(target)) {
							graph.set(target, []);
							inDegree.set(target, 0);
						}
						// Crear la arista fileName -> target
						graph.get(fileName).push(target);
						inDegree.set(target, inDegree.get(target) + 1);
					}
				}
			}
		}
		return { graph, inDegree };
	}

	#topologicalSortFiles(graph, inDegree) {
		const queue = [];
		const result = [];

		// Inicial: los que tienen inDegree=0
		inDegree.forEach((deg, file) => {
			if (deg === 0) queue.push(file);
		});

		while (queue.length > 0) {
			const current = queue.shift();
			result.push(current);

			// Reducir inDegree de sus sucesores
			const neighbors = graph.get(current) || [];
			for (const nxt of neighbors) {
				inDegree.set(nxt, inDegree.get(nxt) - 1);
				if (inDegree.get(nxt) === 0) {
					queue.push(nxt);
				}
			}
		}

		// Si no hemos procesado todos, hay bucles
		if (result.length !== graph.size) {
			console.warn("Hay bucles en las referencias. Se forzará un orden igualmente.");
			const remaining = [...graph.keys()].filter(f => !result.includes(f));
			result.push(...remaining);
		}

		return result; // array de ficheros en orden topológico
	}

	#separateIsolatedAndNonIsolated(sortedFiles, graph, inDegree) {
		const isolated = [];
		const nonIsolated = [];

		for (const file of sortedFiles) {
			const outDegree = (graph.get(file) || []).length;
			const degIn = inDegree.get(file) ?? 0;

			// Aislado = inDegree=0 y outDegree=0
			if (degIn === 0 && outDegree === 0) {
				isolated.push(file);
			} else {
				nonIsolated.push(file);
			}
		}

		// Primero nonIsolated (con referencias), luego isolated
		return [...nonIsolated, ...isolated];
	}

	async #processFilesInOrder(orderedFiles, fileContentMap) {
		for (const fileName of orderedFiles) {
			const content = fileContentMap[fileName];
			if (Array.isArray(content)) {
				for (const item of content) {
					await this.#processItem(item);
				}
			}
			else {
				await this.#processItem(content);
			}
		}
	}

	async #processItem(item) {
		if (item.type === "text") {
			const textName = "text" + this.resourceNames.length;
			this.resourceNames.push(textName);
			this.configs[textName] = item;
			this.#loadThumbnail(`${this.contentFolder}/${item.thumbnailFile}`);
			this.types[textName] = "text";
		}
		else if (item.resourceFile) {
			//Definir el nombre
			const resourceFile = item.resourceFile;

			const parts = resourceFile.split('/');
			const lastPart = parts.pop();
			const resourceName = lastPart.includes('.') ? lastPart.split('.').slice(0, -1).join('.') : lastPart;

			this.resourceNames.push(resourceName);
			this.configs[resourceName] = item;
			this.#loadThumbnail(`${this.contentFolder}/${item.thumbnailFile}`);
			if (!resourceFile.includes('.')) {
				this.types[resourceName] = "folder";
				const subLoader = new Loader(`${this.contentFolder}/${resourceFile}`);
				await subLoader.ready;
				this.children[resourceName] = subLoader;
			} else {				
				const extension = resourceFile.split('.').pop().toLowerCase();
				const loader = this.#getLoaderMethodFromExtension(extension);
				if (loader) {
					this.types[resourceName] = loader.type;
					await loader.loadFunction(`${this.contentFolder}/${resourceFile}`);
				} else {
					console.warn(`No se reconoce extensión: ${extension}`);
					return;
				}
			}
		} else {
			console.error("Error: No es un medio");
		}
	}
	
	#getLoaderMethodFromExtension(extension) {
		const extensionToTypeMap = {
			'gltf': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
			'glb': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
			'stl': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
			'mp4': { type: 'video', loadFunction: this.#loadVideo.bind(this) },
			'jpg': { type: 'image', loadFunction: this.#loadImage.bind(this) },
			'jpeg': { type: 'image', loadFunction: this.#loadImage.bind(this) },
			'png': { type: 'image', loadFunction: this.#loadImage.bind(this) },
			'svg': { type: 'image', loadFunction: this.#loadImage.bind(this) }
		};
		return extensionToTypeMap[extension];
	}

}
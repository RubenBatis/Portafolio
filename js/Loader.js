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
		this.contentFolder = contentFolder;
		
		// Llama a la función de carga y asigna la promesa a `this.ready`
		this.ready = this.loadModelsFromJSON();
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
						action.play();
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
			this.videoElement = document.createElement('video');
			this.videoElement.src = videoFile;

			this.videoElement.preload = 'auto'; // Pre-cargar el video para reducir el tiempo de carga cuando se use
			this.videoElement.muted = true;     // Silenciado por defecto para prevenir reproducción automática con sonido
			// Esperar a que los metadatos se carguen para saber que el video está listo
			this.videoElement.addEventListener('loadedmetadata', () => {
				let videoName = videoFile.split('/').pop().split('.').slice(0, -1).join('.');
				this.videos[videoName] = this.videoElement;
				resolve();
			});

			// Manejador de errores para capturar fallos en la carga
			this.videoElement.addEventListener('error', (event) => {
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
			this.src = "models/not_found.png";
		};						
		this.thumbnails.push(thumbnailElement);
	}

	async #listJSONFiles() {
		try {
			const response = await fetch('/models');
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const jsonFiles = await response.json();
			return jsonFiles;
		} catch (error) {
			console.error('Error fetching models:', error);
		}
	}

	async loadModelsFromJSON() {
		try {
			// Espera a que se resuelva la promesa que devuelve los archivos JSON
			const jsonFiles = await this.#listJSONFiles(); 

			// Asegúrate de que jsonFiles tiene contenido
			if (jsonFiles && jsonFiles.length > 0) {
				
			// Mapa que asocia extensiones a funciones de carga y tipos
            const extensionToTypeMap = {
                'gltf': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
                'glb': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
                'mp4': { type: 'video', loadFunction: this.#loadVideo.bind(this) },
                'webm': { type: 'video', loadFunction: this.#loadVideo.bind(this) },
                'jpg': { type: 'image', loadFunction: this.#loadImage.bind(this) },
                'png': { type: 'image', loadFunction: this.#loadImage.bind(this) },
                // Puedes añadir más extensiones y tipos aquí
            };
				
				const promises = jsonFiles.map(async (jsonFile) => {
					try {
						const response = await fetch(`${this.contentFolder}/${jsonFile}`);
						const config = await response.json();

						// Usar el archivo del modelo y thumbnail
						const configName = config.resourceFile.replace(/\.[^/.]+$/, "");
						this.configs[configName] = config;
						this.resourceNames.push(configName);
						this.#loadThumbnail(`${this.contentFolder}/${config.thumbnailFile}`);

						// Determinar la extensión del archivo y usar el mapa para cargarlo
						const extension = config.resourceFile.split('.').pop().toLowerCase();
						const loader = extensionToTypeMap[extension];

						if (loader) {
							this.types[configName] = loader.type; // Guardar el tipo
							await loader.loadFunction(`${this.contentFolder}/${config.resourceFile}`);
						} else {
							console.warn(`Extensión no reconocida: ${extension}`);
						}
					} catch (error) {
						console.error(`Error al cargar el JSON: ${error}`);
					}
				});
				
				await Promise.all(promises);
				
			} else {
				console.log('No se encontraron archivos JSON.');
			}
		} catch (error) {
			console.error('Error al cargar modelos:', error);
		}
	}
}
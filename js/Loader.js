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
		this.children = []; // Agregar el atributo `children`
		
		// Llama a la función de carga y asigna la promesa a `this.ready`
		this.ready = this.loadContentsFromJSON();
	}

	async #loadModel(modelFile) {
		return new Promise((resolve, reject) => {
			console.log(modelFile);
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
			this.src = "models/not_found.png";
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
				console.error('Error fetching models:', error);
			}
		} else {
			return {};
		}
	}

	async loadContentsFromJSON() {
		try {
			const jsonFiles = await this.#listJSONFiles();
			if (jsonFiles && jsonFiles.length > 0) {
				const validJsonFiles = jsonFiles.filter(file => file.endsWith('.json'));
				const resources = [];
				const loaderPromises = [];

				const extensionToTypeMap = {
					'gltf': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
					'glb': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
					'stl': { type: '3dmodel', loadFunction: this.#loadModel.bind(this) },
					'mp4': { type: 'video', loadFunction: this.#loadVideo.bind(this) },
					'webm': { type: 'video', loadFunction: this.#loadVideo.bind(this) },
					'mkv': { type: 'video', loadFunction: this.#loadVideo.bind(this) },
					'jpg': { type: 'image', loadFunction: this.#loadImage.bind(this) },
					'jpeg': { type: 'image', loadFunction: this.#loadImage.bind(this) },
					'png': { type: 'image', loadFunction: this.#loadImage.bind(this) },
					'svg': { type: 'image', loadFunction: this.#loadImage.bind(this) },
				};

				for (const jsonFile of validJsonFiles) {
					try {
						const response = await fetch(`${this.contentFolder}/${jsonFile}`);
						const config = await response.json();

						const order = config.order ?? Number.MAX_SAFE_INTEGER;
						const isDirectory = !config.resourceFile.includes('.');

						resources.push({
							configName: config.resourceFile.replace(/\.[^/.]+$/, ""),
							config,
							order,
							isDirectory,
						});

						this.#loadThumbnail(`${this.contentFolder}/${config.thumbnailFile}`);
					} catch (error) {
						console.error(`Error al procesar el JSON ${jsonFile}:`, error);
					}
				}

				resources.sort((a, b) => {
					if (a.order === b.order) return 0;
					return a.order - b.order;
				});

				for (const resource of resources) {
					if (resource.isDirectory) {
						const subLoader = new Loader(`${this.contentFolder}/${resource.configName}`);
						//await subLoader.ready;
						loaderPromises.push(subLoader.ready);
						this.children.push(subLoader); // Añadir a los hijos
						this.types[resource.configName] = "folder";
					} else {
						this.children.push(null);
						const extension = resource.config.resourceFile.split('.').pop().toLowerCase();
						const loader = extensionToTypeMap[extension];
						if (loader) {
							this.types[resource.configName] = loader.type;
							await loader.loadFunction(`${this.contentFolder}/${resource.config.resourceFile}`);
						} else {
							console.warn(`Extensión no reconocida: ${extension}`);
						}
					}
					this.resourceNames.push(resource.configName);
					this.configs[resource.configName] = resource.config;
				}
				await Promise.all(loaderPromises);
			} else {
				//console.log('No se encontraron archivos JSON.');
			}
		} catch (error) {
			console.error('Error al cargar modelos:', error);
		}
	}
}
import { GLTFLoader } from "GLTFLoader";
import { AnimationMixer, LoopRepeat } from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
export class Loader {
	constructor(contentFolder) {
		this.modelNames = [];
		this.thumbnails = [];
		this.modelConfigs = {};
		this.mixers = {};
		this.models = {};
		this.animations = {};
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
				const promises = jsonFiles.map(async (jsonFile) => {
				//jsonFiles.forEach(async (jsonFile) => {
					try {
						const response = await fetch(`${this.contentFolder}/${jsonFile}`);
						const config = await response.json();

						// Usar el archivo del modelo y thumbnail
						await this.#loadModel(`${this.contentFolder}/${config.modelFile}`);
						this.#loadThumbnail(`${this.contentFolder}/${config.thumbnailFile}`);
						const modelConfigName = config.modelFile.replace(/\.[^/.]+$/, "");
						this.modelConfigs[modelConfigName] = config;
						this.modelNames.push(modelConfigName);
					} catch (error) {
						console.error(`Error al cargar el JSON: ${error}`);
					}
				});
				
				await Promise.all(promises);
				
				/* Esta funcionalidad hay que pasarla al visor (o quitarla)
				if (this.modelNames.length > 0) {
					this.applyModelConfig(this.modelNames[0]);
				}*/
				
				/* Esta funcionalidad hay que pasarla al carrusel
				if (this.modelNames.length < thumbnails_count) {
					thumbnails_count = this.modelNames.length;
					thHalfCount = Math.floor(thumbnails_count / 2);
				}*/
				
			} else {
				console.log('No se encontraron archivos JSON.');
			}
		} catch (error) {
			console.error('Error al cargar modelos:', error);
		}
	}
}
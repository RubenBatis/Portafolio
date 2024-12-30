import { Viewer } from './Viewer.js';
import { Loader } from './Loader.js';
import * as THREE from "three";
import { OrbitControls } from "OrbitControls";
export class ModelViewer extends Viewer{
	constructor(parentElement, {
		initContent = 0,
		loader = null,
		currentItemIndex = { value: 0 },
		applyConfigOnInit = true,
		orientation = "bottom", 
		appendControls = true,
		controls = null
	} = {}) {
		super(parentElement, loader, {orientation: orientation, appendControls: appendControls});

		// Crear escena y renderer
		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.canvas = this.renderer.domElement;
		this.canvas.className = "viewerContent " + orientation;
		this.viewerElement.appendChild(this.canvas);

		this.domElement = this.canvas;
		this.currentItemIndex = currentItemIndex;
		this.camera = null;
		this.controls = null;

		// Animación y reloj
		this.clock = new THREE.Clock();

		// Promesa de ready
		this.ready = this.#initialize(initContent, applyConfigOnInit);
	}
	
	// Configurar el tamaño del canvas y renderer
	#resize() {
		const width = this.viewerElement.clientWidth;
		const height = this.viewerElement.clientHeight;
		this.renderer.setSize(width * 2, height * 2, false);
		this.canvas.style.width = `${this.viewerElement.clientWidth}px`;
		this.canvas.style.height = `${this.viewerElement.clientHeight}px`;
	}
	
	async #initialize(initContent, applyConfigOnInit) {
		try {
			console.log("Inicializando ModelViewer...");
			await this.#ensureCanvasIsVisible();
			await this.#setupControlsAndCamera();

			if (applyConfigOnInit) {
				console.log("Aplicando configuración inicial...");
				this.applyConfig(this.loader.resourceNames[initContent]);
			}

			console.log("ModelViewer inicializado completamente.");
			this.animate = this.animate.bind(this);
			this.animate(); // Inicia la animación
		} catch (error) {
			console.error("Error durante la inicialización de ModelViewer:", error);
			throw error; // Rechaza la promesa si algo falla
		}
	}
	
	async #ensureCanvasIsVisible(timeout = 5000) {
		const interval = 100; // Intervalo de verificación
		const maxAttempts = Math.ceil(timeout / interval); // Intentos permitidos
		let attempts = 0;

		while (attempts < maxAttempts) {
			const width = this.canvas.clientWidth;
			const height = this.canvas.clientHeight;

			if (width > 0 && height > 0) {
				console.log("Canvas visible con dimensiones:", width, height);
				return;
			}

			attempts++;
			await new Promise(resolve => setTimeout(resolve, interval));
		}

		throw new Error("Canvas no se hizo visible dentro del tiempo permitido.");
	}
	
	// Configurar la cámara.
	async #setupCamera() {
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;

		if (width === 0 || height === 0) {
			throw new Error("No se puede configurar la cámara: el canvas tiene dimensiones inválidas.");
		}

		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		this.scene.add(camera);
		console.log("Cámara configurada con dimensiones:", width, height);
		return camera;
	}

	// Llamar a la anterior y esperar a que termine para configurar los controles.
	async #setupControlsAndCamera() {
		try {
			console.log("Configurando cámara y controles...");
			this.camera = await this.#setupCamera();

			this.controls = new OrbitControls(this.camera, this.canvas);
			this.controls.enableDamping = true;
			this.controls.dampingFactor = 0.25;
			this.controls.enableZoom = true;
			this.controls.enableRotate = true;
			this.controls.mouseButtons = {
				LEFT: THREE.MOUSE.ROTATE,
				MIDDLE: null,
				RIGHT: THREE.MOUSE.PAN
			};

			console.log("Cámara y controles configurados.");
		} catch (error) {
			console.error("Error al configurar cámara y controles:", error);
			throw error;
		}
	}


	// Método para alternar la pausa/reproducción
	toggleAnimationPause() {
		let mixer = this.loader.mixers[this.loader.resourceNames[this.currentItemIndex.value]];
		if (mixer) {
			mixer._actions.forEach(action => {
				action.paused = !action.paused;
				this.togglePauseButtonIcon(!action.paused)
			});
		}
	}
	
	// Reiniciar la animación actual
	reset() {
		const modelName = this.loader.resourceNames[this.currentItemIndex.value];
		const mixer = this.loader.mixers[modelName];

		if (mixer) {
			const currentAction = this.currentAction;

			if (currentAction) {
				const paused = currentAction.paused
				currentAction.reset();
				currentAction.paused = paused;
			} else {
				console.warn(`No hay una animación activa para reiniciar en el modelo: ${modelName}`);
			}
		} else {
			console.warn(`No se encontró un mixer para el modelo: ${modelName}`);
		}
	}

	// Métodos para limpiar la escena
	#disposeNode(node) {
		if (node.geometry) {
			node.geometry.dispose();
		}

		if (node.material) {
			if (Array.isArray(node.material)) {
				node.material.forEach(material => material.dispose());
			} else {
				node.material.dispose();
			}
		}

		if (node.texture) {
			node.texture.dispose();
		}
	}

	#clearScene(scene) {
		while (scene.children.length > 0) {
			const object = this.scene.children[0];
			this.scene.remove(object);

			// Liberar recursos de geometría, materiales y texturas
			if (object.geometry) object.geometry.dispose();
			if (object.material) {
				if (Array.isArray(object.material)) {
					object.material.forEach(mat => mat.dispose());
				} else {
					object.material.dispose();
				}
			}

			// Liberar texturas en caso de que existan
			if (object.texture) {
				object.texture.dispose();
			}
			
			// Eliminar luces
			if (object.isLight) {
				object.dispose();  // Elimina la luz y libera recursos
			}
			
			if (this.scene.lights) {
				this.scene.lights.forEach(light => {
					this.scene.remove(light);
					if (light.dispose) light.dispose(); // Liberar recursos de cada luz
				});
				this.scene.lights = []; // Limpia la referencia a las luces eliminadas
			}
		}
	}

	//Antes de cada cambio de contenido, se guardan algunas configuraciones del anterior.
	saveConfig(modelName) {
		this.loader.configs[modelName].camera.position = [this.camera.position.x,
														 this.camera.position.y,
														 this.camera.position.z];
		this.loader.configs[modelName].camera.rotation = [this.camera.rotation._x,
														 this.camera.rotation._y,
														 this.camera.rotation._z];
		this.loader.configs[modelName].camera.lookAt = [this.controls.target.x,
														 this.controls.target.y,
														 this.controls.target.z];
		if (this.currentAction) {
			this.loader.configs[modelName].activeAnimation = this.currentAction.getClip().name; // Guardar el nombre de la animación actual
		}
	}

	// Método que aplica la configuración de cada modelo a la visualización
	applyConfig(modelName) {
		const config = super.applyConfig(modelName);
		// Eliminar todos los elementos de la escena
		this.#clearScene(this.scene);
		
		// Y volver a cargar el modelo en cuestión
		const model = this.loader.models[modelName];

		this.scene.add(model);
		
		// Cambiar el color de fondo de la escena 3D
		this.scene.background = new THREE.Color(config.backgroundColor);
		//renderer.setClearColor(0x000000, 0); //Esto pondría el fondo transparente

		// Configuración de la cámara
		if (config.camera) {
			const cameraPosition = config.camera.position;
			const cameraRotation = config.camera.rotation;
			const cameraLookAt = config.camera.lookAt;
			const cameraZoom = config.camera.zoom || 1;

			this.camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
			this.camera.rotation.set(cameraRotation[0], cameraRotation[1], cameraRotation[2]);
			this.controls.target.set(cameraLookAt[0], cameraLookAt[1], cameraLookAt[2]);
			this.controls.update();
			this.camera.zoom = cameraZoom;
			this.camera.updateProjectionMatrix();  // Esto es necesario después de ajustar el zoom
		}
		
		// Añadir nuevas luces desde la configuración
		config.lights.forEach(lightConfig => {
			const light = new THREE.DirectionalLight(lightConfig.color, lightConfig.intensity);
			light.position.set(lightConfig.position[0], lightConfig.position[1], lightConfig.position[2]);
			this.scene.add(light);

			if (!this.scene.lights) {
				this.scene.lights = [];
			}
			this.scene.lights.push(light);
		});

		// Configurar luz ambiental si está definida
		if (config.ambientLight) {
			const ambientLight = new THREE.AmbientLight(config.ambientLight.color, config.ambientLight.intensity);
			this.scene.add(ambientLight);
		}
				
		const mixer = this.loader.mixers[modelName];
		
		if (mixer) {
			this.togglePauseButtonIcon(!mixer._actions[0].paused || false); // esto hay que cambiarlo con las animaciones múltiples
		
			const actions = mixer._actions || [];
			if (actions.length > 0) {
				const activeActionName = config.activeAnimation || actions[0]._clip.name;
				const activeAction = actions.find(action => action._clip.name === activeActionName);

				if (activeAction) {
					this.currentAction = activeAction;
					console.log(`Animación activa establecida: ${activeActionName}`);
				} else {
					console.warn(`No se encontró la animación activa: ${activeActionName}`);
					this.currentAction = null;
				}
			}
		}
		
		const hasAnimations = mixer && mixer._actions.length > 0;
		const multipleAnimations = hasAnimations && mixer._actions.length > 1;
		this.selectControls({
			playPause: hasAnimations,           // Mostrar si hay animaciones
			toggleDescription: true,            // Siempre mostrar
			reset: hasAnimations,               // Mostrar si hay animaciones
			changeAnimation: multipleAnimations // Mostrar si hay más de una animación
		});
	}

	// Animar la escena
	animate = () => {
		requestAnimationFrame(this.animate);
		
		// Solo redimensionar si el tamaño ha cambiado
		const width = this.viewerElement.clientWidth;
		const height = this.viewerElement.clientHeight;
		if (this.renderer.getSize(new THREE.Vector2()).x !== width || 
			this.renderer.getSize(new THREE.Vector2()).y !== height) {
			this.#resize();
		}
		
		const mixer = this.loader.mixers[this.loader.resourceNames[this.currentItemIndex.value]];
		
		// Si hay un mixer activo, actualizarlo
		if (mixer) {
			const delta = this.clock.getDelta();  // Usamos delta para actualizar el mixer
			mixer.update(delta);  // Actualizamos el mixer
		}
		if (this.controls) {
			this.controls.update(); // Actualizar los controles
		}
		if (this.camera) {
			// Actualizar la relación de aspecto de la cámara si cambia el tamaño del renderer
			this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.render(this.scene, this.camera);
		}
	}
}
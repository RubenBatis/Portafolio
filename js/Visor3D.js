import { Loader } from './Loader.js';
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
export class Visor3D {
	constructor(contentFolder, parentElement, initModel = 0) {
		// Crear la escena y el renderer
		console.log("1");
		this.loader = new Loader(contentFolder);
		this.parentElement = parentElement;
		this.currentItemIndex = 0;
		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth * 2, window.innerHeight * 2);
		this.canvas = this.renderer.domElement;
		
		//Ajustar el tamaño del canvas
		this.canvas.style.width = window.innerWidth + 'px';
		this.canvas.style.height = (window.innerHeight * 0.8) + 'px'; //esto está fatal
		
		this.camera = null;
		this.controls = null;

		this.#setupControlsAndCamera();
		
		let ambientLight = new THREE.AmbientLight(0x404040); // Luz ambiental // también está fatal
		this.scene.add(ambientLight);
		
		this.#createDescriptionPanel();
		this.#createAnimControls();
		
		this.parentElement.appendChild(this.canvas);
		
		// Espera a que el loader esté listo
        this.loader.ready.then(() => {
            this.applyModelConfig(this.loader.modelNames[initModel]);
            this.animate();
        }).catch(error => {
            console.error('Error al cargar los modelos:', error);
        });
	}
	
	// Función para configurar el tamaño del canvas y renderer
	#resizeRendererToDisplaySize() {
		const width = window.innerWidth;
		const height = window.innerHeight * 0.8;

		this.renderer.setSize(width * 2, height * 2, false);
		this.canvas.style.width = width + 'px';
		this.canvas.style.height = height + 'px';
	}
	
	async #setupCamera() {
		// Esperamos hasta que el canvas tenga un tamaño mayor que 0
		while (this.canvas.clientWidth === 0 || this.canvas.clientHeight === 0) {
			console.log("Esperando que el canvas tenga dimensiones...");
			await new Promise(resolve => setTimeout(resolve, 100)); // Esperar 100ms antes de verificar de nuevo
		}

		// Ahora que el canvas tiene dimensiones válidas, podemos configurar la cámara
		const width = this.canvas.clientWidth;
		const height = this.canvas.clientHeight;
		const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
		return camera;
	}

	async #setupControlsAndCamera() {
	try {
		this.camera = await this.#setupCamera();
		this.scene.add(this.camera);

		// Añadir controles de órbita
		this.controls = new OrbitControls(this.camera, this.canvas);
		this.controls.enableDamping = true; // Suaviza el movimiento
		this.controls.dampingFactor = 0.25;
		this.controls.enableZoom = true;
		this.controls.enableRotate = true;

		this.controls.mouseButtons = {
			LEFT: THREE.MOUSE.ROTATE,    // Mantén el botón izquierdo para rotar
			MIDDLE: null,                // Desactiva el botón central (rueda)
			RIGHT: THREE.MOUSE.PAN       // Mantén el botón derecho para hacer pan
		};

		// Aquí puedes configurar otras propiedades iniciales o llamar a funciones de la cámara o los controles
		} catch (error) {
			console.log("Error al configurar la cámara:", error);
		}
	}
	
	#updateModelDescription(description, backgroundColor) {
		const descriptionDiv = document.querySelector("#description-panel");
		
		if (descriptionDiv) {
			descriptionDiv.innerHTML = description.replace(/\n/g, '<br>');
			descriptionDiv.style.color = backgroundColor;
			document.getElementById("toggle-button").style.color = backgroundColor;
			document.getElementById("pause-button").style.color = backgroundColor;
		}
	}
	
	// Crear y añadir el panel de descripción
	#createDescriptionPanel() {
		let descriptionPanel = document.createElement('div');
		descriptionPanel.id = 'description-panel';
		descriptionPanel.style.display = 'none';
		this.parentElement.appendChild(descriptionPanel);

		// Crear y añadir el botón de mostrar/ocultar
		let toggleButton = document.createElement('button');
		toggleButton.id = 'toggle-button';
		toggleButton.innerText = '\u2261';
		toggleButton.addEventListener('click', () => {
			if (descriptionPanel.style.display === 'none') {
				descriptionPanel.style.display = 'block';
				descriptionPanel.offsetHeight;
				descriptionPanel.style.filter = 'invert(100%)'
			} else {
				descriptionPanel.style.display = 'none';
			}
		});
		this.parentElement.appendChild(toggleButton);
	}
	
	// Crear y añadir el botón de pausa
	#createAnimControls() {
		this.pauseButton = document.createElement('button');
		this.pauseButton.id = 'pause-button';
		this.pauseButton.innerHTML = '⏸';
		this.parentElement.appendChild(this.pauseButton);
		this.isPaused = false;
		
		// Alternar la animación al hacer clic en el botón
		this.pauseButton.addEventListener('click', this.#toggleAnimationPause);

		// Alternar con la tecla Espacio
		window.addEventListener('keydown', (event) => {
			if (event.code === 'Space') {
				this.#toggleAnimationPause();
			}
		});
	}
	
	// Método para alternar la pausa/reproducción
	#toggleAnimationPause() {
		let mixer = this.loader.mixers[this.loader.modelNames[this.currentItemIndex]];
		if (mixer) {
			mixer._actions.forEach(action => {
				action.paused = !action.paused;
			});
		}
	}
	
	// Mostrar el botón si el modelo tiene animaciones
	#togglePauseButton(modelName) {
		console.log(this.loader.mixers);
		if (this.loader.mixers[modelName]) {
			this.pauseButton.style.display = 'block';
		} else {
			this.pauseButton.style.display = 'none';
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

	// Método que aplica la configuración de cada modelo a la visualización
	applyModelConfig(modelName) {
		const config = this.loader.modelConfigs[modelName];
		// Eliminar todos los elementos de la escena
		this.#clearScene(this.scene);
		
		// Y volver a cargar el modelo en cuestión
		let model = this.loader.models[modelName];
		console.log(model);
		this.scene.add(model);			
		
		// Cambiar el color de fondo de la escena 3D
		this.scene.background = new THREE.Color(config.backgroundColor);
		//renderer.setClearColor(0x000000, 0); //Esto pone el fondo transparente
		
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

		/* Esta funcionalidad hay que pasarla al carrusel
		// Cambiar el color del degradado de fondo en los thumbnails y reordenarlos
		updateThumbnailsBackground(config.backgroundColor);
		updateThumbnailDisplay();*/

		// Mostrar la descripción en el HTML
		this.#updateModelDescription(config.description, config.backgroundColor);
		
		// Verificar si el modelo tiene animaciones y manejar el botón de pausa
		this.#togglePauseButton(modelName);
	}
	
	// Animar la escena
	animate = () => {
		requestAnimationFrame(this.animate);
		this.#resizeRendererToDisplaySize();
		let mixer = this.loader.mixers[this.loader.modelNames[this.currentModelIndex]];
		// Si hay un mixer activo, actualizarlo
		if (mixer) {
			const delta = clock.getDelta();  // Usamos delta para actualizar el mixer
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
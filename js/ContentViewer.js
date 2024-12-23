import { Viewer } from './Viewer.js';
import { ImageViewer } from './ImageViewer.js';
import { VideoViewer } from './VideoViewer.js';
import { ModelViewer } from './ModelViewer.js';
import { Carousel } from './Carousel.js';
import { Loader } from './Loader.js';
//Clase envolvente del resto de clases viewer
export class ContentViewer extends Viewer {
	constructor(parentElement, {
		contentFolder = "/models",
		initContent = 0 ,
		loader = new Loader(contentFolder),
		orientation = "bottom",
		generation = 1,
		maxGeneration = generation,
		viewers = null, 
		appendControls = true
	} = {}) {
		super(parentElement, loader);
		this.loader = loader;
		this.parentElement = parentElement;
		this.currentItemIndex = {"value": initContent};
		this.orientation = orientation;
		
		this.viewerFrame = document.createElement("div");
		this.viewerFrame.className = "viewerContent " + orientation;
		this.viewerFrame.style.overflow = "hidden";

		if (maxGeneration === generation) {
			this.viewerElement.className = "filler";
			this.viewerElement.appendChild(this.viewerFrame);
		} else {
			this.innerViewerContainer = document.createElement("div");
			this.innerViewerContainer.className = "inner-viewer-container";
			this.innerFiller = document.createElement("div");
			this.innerFiller.className = "filler";
			this.viewerElement.appendChild(this.innerViewerContainer);
			this.innerViewerContainer.appendChild(this.innerFiller);
			this.innerFiller.appendChild(this.viewerFrame);
		}
		
		this.domElement = parentElement;
	
		this.viewers = {
			'image': (viewers && viewers["image"]) ? viewers["image"] : new ImageViewer(this.viewerFrame, {
																											loader: this.loader, 
																											currentItemIndex: this.currentItemIndex, 
																											applyConfigOnInit: false, 
																											orientation: orientation,
																											appendControls: maxGeneration === generation
																										}),
			'video': (viewers && viewers["video"]) ? viewers["video"] : new VideoViewer(this.viewerFrame, {
																											loader: this.loader,
																											currentItemIndex: this.currentItemIndex,
																											applyConfigOnInit: false,
																											orientation:orientation,
																											appendControls: maxGeneration === generation
																										}),
			'3dmodel': (viewers && viewers["3dmodel"]) ? viewers["3dmodel"] : new ModelViewer(this.viewerFrame, {
																												  loader: this.loader,
																												  currentItemIndex: this.currentItemIndex,
																												  applyConfigOnInit: false,
																												  orientation: orientation,
																												  appendControls: maxGeneration === generation
																											  })
		}

		Promise.all([this.loader.ready, ...Object.values(this.viewers).map(viewer => viewer.ready)]).then(() => {
			this.carousel = new Carousel(this.viewerFrame, {viewer: this, position: orientation});//, append: false});
			this.nextOrientation = this.#clockwiseNext();
			if (generation > 0) {
				this.viewers['folder'] = new ContentViewer(this.viewerFrame, {loader: this.loader, orientation: this.nextOrientation, maxGeneration: maxGeneration, generation: generation - 1});
			}
			this.carousel.ready.then(() => {

				// Verificar que resourceNames está disponible y luego llamar a applyConfig
				if (this.loader.resourceNames && this.loader.resourceNames.length > 0) {
					this.applyConfig(this.loader.resourceNames[initContent]);
				} else {
					console.error("resourceNames está vacío o no se pudo cargar.");
				}
			});
        }).catch(error => {
            console.error("Error al cargar el loader:", error);
        });
	}
	
	#clockwiseNext() {
		const orientations = ["top", "right", "bottom", "left"];
		let next = orientations.indexOf(this.orientation) + 1;
		if (next === orientations.length) {
			next = 0;
		}
		return orientations[next];
	}
	
	setActive(isActive) {
		this.isActive = isActive;
        // Dejar de escuchar eventos de visores inactivos
        if (isActive) {
            this.toggleButton.classList.add("active");
        } else {
            this.toggleButton.classList.remove("active");
			Object.values(this.viewers).forEach((viewer) => {
console.log("desactivando ", viewer.domElement.tagName);
				viewer.setActive(isActive);
			});
        }
    }
	
	setLoader(loader) {
		this.loader = loader;
		//this.showContent(loader.getFirstElement());
		this.carousel.setLoader(this.loader);
		//this.applyConfig(this.loader.resourceNames[this.currentItemIndex.value]);
		Object.values(this.viewers).forEach((viewer) => {
			viewer.setLoader(loader);
		});
	}
	
	selectActiveViewer() {
		let activeViewer = null;
		Object.values(this.viewers).forEach((viewer) => {
			if (viewer.isActive) {
				activeViewer = viewer;
			}
		});
		return activeViewer;
	}
	
	toggleAnimationPause() {
		this.selectActiveViewer().toggleAnimationPause();
	}
	
	saveConfig(contentName) {
		let type = this.loader.types[contentName];
		if(!type || !this.viewers[type]) {
			console.error(`Tipo de contenido ${type} no reconocido o viewer no encontrado.`);
            return;
		} else {
			if(type != "folder") {
				this.viewers[type].saveConfig(contentName);
			}
		}
		if(type === "folder") {
			this.loader.configs[contentName]["currentItemIndex"] = this.currentItemIndex.value;
		}
	}
		
	applyConfig(contentName) {
		let type = this.loader.types[contentName];
		console.log(contentName);
		if(!type || !this.viewers[type]) {
			console.error(`Tipo de contenido ${type} no reconocido o viewer no encontrado.`);
            return;
		} else {
			if(type != "folder") {
				this.viewers[type].applyConfig(contentName);
			}
			Object.keys(this.viewers).forEach((key) => {
				if (key === type) {
					this.viewers[key].viewerElement.style.display = "block";
					this.viewers[key].viewerElement.style["pointer-events"] = "auto";
					this.viewers[key].setActive(true);
				} else {
					this.viewers[key].viewerElement.style.display = "none";
					this.viewers[key].viewerElement.style["pointer-events"] = "none";
					this.viewers[key].setActive(false);
				}
			});
		}
		if(type === "folder") {
			const config = super.applyConfig(contentName);
			this.viewers[type].setLoader(this.loader.children[this.currentItemIndex.value]);

			let index = 0;
			if (config.currentItemIndex) {
				index = config.currentItemIndex;
			} else if (config.defaultContent) {
				index = this.loader.children[this.currentItemIndex.value].resourceNames.indexOf(config.defaultContent);
			}
			this.viewers[type].currentItemIndex.value = index;
			this.viewers[type].applyConfig(this.loader.children[this.currentItemIndex.value].resourceNames[index]);
		}
	}
}

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
		viewers = null
	} = {}) {
		super(parentElement, loader);
		this.loader = loader;
		this.parentElement = parentElement;
		this.currentItemIndex = {"value": initContent};
		this.orientation = orientation;
		
		this.viewerFrame = document.createElement("div");
		this.viewerFrame.className = "viewerContent";
		this.viewerFrame.style.overflow = "hidden";

		/* antes:
		if (maxGeneration === generation) {
			this.viewerElement.className = "filler";
		}
		this.viewerElement.appendChild(this.viewerFrame);*/

		if (maxGeneration === generation) {
			this.viewerElement.className = "filler";
			this.viewerElement.appendChild(this.viewerFrame);
		} else {
			this.innerViewerContainer = document.createElement("div");
			this.innerViewerContainer.className = "inner-viewer-container " + orientation;
			this.innerFiller = document.createElement("div");
			this.innerFiller.className = "filler";
			this.viewerElement.appendChild(this.innerViewerContainer);
			this.innerViewerContainer.appendChild(this.innerFiller);
			this.innerFiller.appendChild(this.viewerFrame);
		}
		
		this.domElement = parentElement;

		this.currentLoader = this.loader;
		
		this.viewers = {
			'image': (viewers && viewers["image"]) ? viewers["image"] : new ImageViewer(this.viewerFrame, {
																											loader: this.loader, 
																											currentItemIndex: this.currentItemIndex, 
																											applyConfigOnInit: false, 
																											orientation: orientation
																										}),
			'video': (viewers && viewers["video"]) ? viewers["video"] : new VideoViewer(this.viewerFrame, {
																											loader: this.loader,
																											currentItemIndex: this.currentItemIndex,
																											applyConfigOnInit: false,
																											orientation:orientation
																										}),
			'3dmodel': (viewers && viewers["3dmodel"]) ? viewers["3dmodel"] : new ModelViewer(this.viewerFrame, {
																												  loader: this.loader,
																												  currentItemIndex: this.currentItemIndex,
																												  applyConfigOnInit: false,
																												  orientation: orientation
																											  })
		}

		Promise.all([this.loader.ready, ...Object.values(this.viewers).map(viewer => viewer.ready)]).then(() => {
			this.carousel = new Carousel(this.viewerFrame, {viewer: this, position: orientation});//, append: false});
			if (generation > 0) {
				this.viewers['folder'] = new ContentViewer(this.viewerFrame, {loader: this.loader, orientation: "left", maxGeneration: maxGeneration, generation: generation - 1});
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
	
	setLoader(loader) {
		this.currentLoader = loader;
		//this.showContent(loader.getFirstElement());
		this.carousel.setLoader(this.currentLoader);
		this.applyConfig(this.currentLoader.resourceNames[this.currentItemIndex.value]);
	}
	
	resetLoader() {
		this.currentLoader = this.loader;
		//this.showContent(loader.getFirstElement());
		this.carousel.setLoader(this.currentLoader);
		this.applyConfig(this.loader.resourceNames[this.currentItemIndex.value]);
	}
	
	saveConfig(contentName) {
		let type = this.currentLoader.types[contentName];
		if(!type || !this.viewers[type]) {
			console.error(`Tipo de contenido ${type} no reconocido o viewer no encontrado.`);
            return;
		} else {
			if(type != "folder") {
				this.viewers[type].saveConfig(contentName);
			}
		}
		if(type === "folder") {
			this.currentLoader.configs[contentName] = this.currentItemIndex.value;
		}
	}
	
	applyConfig(contentName) {
		let type = this.currentLoader.types[contentName];
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
			this.viewers[type].setLoader(this.currentLoader.children[this.currentItemIndex.value]);
			this.currentItemIndex.value = config.currentItemIndex ? config.currentItemIndex : 0;
		}
	}
}

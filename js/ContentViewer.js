import { Viewer } from './Viewer.js';
import { ImageViewer } from './ImageViewer.js';
import { VideoViewer } from './VideoViewer.js';
import { ModelViewer } from './ModelViewer.js';
import { Loader } from './Loader.js';
//Clase envolvente de las tre clases viewer, no hereda de viewer, solo replica funcionalidades.
export class ContentViewer extends Viewer {
	constructor(contentFolder, parentElement, { initContent = 0 , loader = new Loader(contentFolder)} = {}) {
		super(parentElement, loader);
		this.loader = loader;
		this.parentElement = parentElement;
		this.currentItemIndex = {"value": initContent};
this.viewerElement.style.display = "none";
		this.currentLoader = this.loader;
		
		this.viewers = {
			'image': new ImageViewer(this.parentElement, {loader: this.loader, currentItemIndex: this.currentItemIndex, applyConfigOnInit: false}),
			'video': new VideoViewer(this.parentElement, {loader: this.loader, currentItemIndex: this.currentItemIndex, applyConfigOnInit: false}),
			'3dmodel': new ModelViewer(this.parentElement, {loader: this.loader, currentItemIndex: this.currentItemIndex, applyConfigOnInit: false})
		}
		
		// Esperar a que el loader esté listo
		Promise.all([this.loader.ready, ...Object.values(this.viewers).map(viewer => viewer.ready)]).then(() => {
            // Verificar que resourceNames está disponible y luego llamar a applyConfig
            if (this.loader.resourceNames && this.loader.resourceNames.length > 0) {
                this.applyConfig(this.loader.resourceNames[initContent]);
            } else {
                console.error("resourceNames está vacío o no se pudo cargar.");
            }
        }).catch(error => {
            console.error("Error al cargar el loader:", error);
        });
	}
	
	setLoader(loader) {
		this.currentLoader = loader;
		//this.showContent(loader.getFirstElement());
		this.applyConfig(this.loader.resourceNames[this.currentItemIndex.value]);
	}
	
	resetLoader() {
		this.currentLoader = this.loader;
		//this.showContent(loader.getFirstElement());
		this.applyConfig(this.loader.resourceNames[this.currentItemIndex.value]);
	}
	
	saveConfig(contentName) {
		let type = this.currentLoader.types[contentName];
		if(type === "folder") {
			
		} else if(!type || !this.viewers[type]) {
			console.error(`Tipo de contenido ${type} no reconocido o viewer no encontrado.`);
            return;
		} else {
			this.viewers[type].saveConfig(contentName);
		}
	}
	
	applyConfig(contentName) {
		let type = this.currentLoader.types[contentName];

		if(type === "folder") {
			
		}
		else if(!type || !this.viewers[type]) {
			console.error(`Tipo de contenido ${type} no reconocido o viewer no encontrado.`);
            return;
		} else {
			this.viewers[type].applyConfig(contentName);
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
	}
}

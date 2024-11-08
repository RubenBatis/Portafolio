import { ImageViewer } from './ImageViewer.js';
import { VideoViewer } from './VideoViewer.js';
import { ModelViewer } from './ModelViewer.js';
import { Loader } from './Loader.js';
//Clase envolvente de las tre clases viewer, no hereda de viewer, solo replica funcionalidades.
export class ContentViewer {
	constructor(contentFolder, parentElement, { initContent = 0 } = {}) {
		this.loader = new Loader(contentFolder);
		this.parentElement = parentElement;
		this.currentItemIndex = {"value": initContent};
		
		this.viewers = {
			'image': new ImageViewer(contentFolder, this.parentElement, {loader: this.loader, currentItemIndex: this.currentItemIndex, applyConfigOnInit: false}),
			'video': new VideoViewer(contentFolder, this.parentElement, {loader: this.loader, currentItemIndex: this.currentItemIndex, applyConfigOnInit: false}),
			'3dmodel': new ModelViewer(contentFolder, this.parentElement, {loader: this.loader, currentItemIndex: this.currentItemIndex, applyConfigOnInit: false})
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
	
	saveConfig(contentName) {
		let type = this.loader.types[contentName];
		this.viewers[type].saveConfig(contentName);
	}
	
	applyConfig(contentName) {
		let type = this.loader.types[contentName];

		if(!type || !this.viewers[type]) {
			console.error(`Tipo de contenido ${type} no reconocido o viewer no encontrado.`);
            return;
		}
		
		this.viewers[type].applyConfig(contentName);
		Object.keys(this.viewers).forEach((key) => {
			if (key === type) {
				this.viewers[key].domElement.style.display = "block";
				this.viewers[key].domElement.style["pointer-events"] = "auto";
			} else {
				this.viewers[key].domElement.style.display = "none";
				this.viewers[key].domElement.style["pointer-events"] = "none";
			}
		});
	}
}

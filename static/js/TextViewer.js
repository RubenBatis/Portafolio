import { Viewer } from './Viewer.js';

export class TextViewer extends Viewer {
    constructor(parentElement, {
		initContent = 0,
		loader = null,
		currentItemIndex = {"value":0},
		applyConfigOnInit = true,
		orientation = "bottom", 
		appendControls = true,
		controls = null,
		language = "es",
		upperParent = null
    } = {}) {
        super(parentElement, loader, { orientation: orientation, appendControls: appendControls, upperParent: upperParent});

        this.textContainer = document.createElement('div');
        this.textContainer.className = "texts-container";


        this.viewerElement.appendChild(this.textContainer);
        this.domElement = this.textContainer;
		
		this.language = language;

        if (applyConfigOnInit) {
            this.ready.then(() => {
                this.applyConfig(this.loader.resourceNames[initContent]);
            }).catch((error) => {
                console.error("Error al aplicar la configuración en TextViewer:", error);
            });
        }
    }

	updateLanguage(selectedLang = this.language) {
		this.language = selectedLang;
		const allTextElements = this.textContainer.querySelectorAll('[class^="text-"]');
		allTextElements.forEach(textElement => {
			if (textElement.classList.contains(`text-${selectedLang}`)) {
				textElement.style.display = 'inline';
			} else {
				textElement.style.display = 'none';
			}
		});
		this.textContainer.offsetHeight;
	}

    applyConfig(textName) {
        const config = super.applyConfig(textName);

        // Configurar el texto
		this.text = config.text.replace(/\n/g, '<br>') || "";
        this.textContainer.innerHTML = this.text || "";
		if (config.size) textContainer.style.fontSize = config.size;
		if (config.color) textContainer.style.color = config.color;
		
        // No hay controles necesarios
        this.selectControls({
            playPause: false,
            toggleDescription: false,
            reset: false,
            changeAnimation: false,
        });
		
		this.updateLanguage();
    }
}

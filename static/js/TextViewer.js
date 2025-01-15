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

		this.textWrapper = document.createElement('div');
		this.textWrapper.className = "wrapper " + orientation;
		this.textWrapper.style.overflow = "hidden";
		this.textWrapper.appendChild(this.textContainer);
		
		this.textFrame = document.createElement('div');
		this.textFrame.className = "viewerContent " + orientation;
		this.textFrame.style.overflow = "hidden";
		this.textFrame.appendChild(this.textWrapper);
		
		this.viewerElement.appendChild(this.textFrame);
		this.domElement = this.textContainer;

		this.language = language;
		
		this.currentPosition = 0;
		
		this.currentItemIndex = currentItemIndex;
		
		this.language = language;
		
		if (applyConfigOnInit) {
			this.ready.then(() => {
				this.applyConfig(this.loader.resourceNames[initContent]);
			}).catch((error) => {
				console.error("Error al aplicar la configuración en TextViewer:", error);
			});
		}
		
		this.textFrame.addEventListener('wheel', (e) => this.handleScroll(e), { passive: false });
	}

	// Manejar el scroll manualmente
handleScroll(event) {
	if (!this.manualScrollEnabled) {
		return;
	}

	event.preventDefault();

	const frameHeight = this.textFrame.clientHeight;
	const textHeight	= this.textContainer.scrollHeight;
	const minOffset	 = frameHeight - textHeight; 
	const maxOffset	 = 0;

	const wheelStep = 20;
	if (this.currentPosition == null) this.currentPosition = 0;

	if (event.deltaY > 0) {
		// scroll down => texto sube
		this.currentPosition -= wheelStep;
	} else {
		// scroll up => texto baja
		this.currentPosition += wheelStep;
	}

	// clamp
	this.currentPosition = Math.min(this.currentPosition, maxOffset);
	this.currentPosition = Math.max(this.currentPosition, minOffset);

	this.textContainer.style.transform = `translateY(${this.currentPosition}px)`;
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
		if (config.size) this.textContainer.style.fontSize = config.size;
		if (config.color) this.textContainer.style.color = config.color;
		
		this.updateLanguage();
		this.textContainer.offsetHeight;

		const frameHeight = this.textFrame.clientHeight;
		const textHeight	= this.textContainer.scrollHeight;
		
		const space = frameHeight - textHeight; 
		
		if (space >= 0) {
			const halfSpace = space / 2;
			this.textContainer.style.transform = `translateY(${halfSpace}px)`;
			
			this.manualScrollEnabled = false;
		} else {
			this.textContainer.style.transform = `translateY(0px)`;
			this.currentPosition = 0;
			this.manualScrollEnabled = true;
		}
		
		this.selectControls({ 
			playPause: false,
			toggleDescription: false,
			reset: false,
			changeAnimation: false
		});
	}
}

import EventBus from './EventBus';
import SelectionManager from './SelectionManager';
import SanitizerManager from './SanitizerManager';
import HistoryManager from './HistoryManager';
import CommandManager from './CommandManager';
import KeyboardManager from './KeyboardManager';
import PasteProcessor from './PasteProcessor';

const DEFAULT_TOOLBAR = [
    'bold', 'italic', 'underline', 'strike', 'h2', 'blockquote',
    'ul', 'ol', 'link', 'image', 'code', 'undo', 'redo', 'source'
];

const BUTTON_LABELS = {
    bold: 'B', italic: 'I', underline: 'U', strike: 'S',
    h2: 'H2', blockquote: '"', ul: 'UL', ol: 'OL',
    link: 'Link', image: 'Image', code: '</>',
    undo: 'Undo', redo: 'Redo', source: 'HTML'
};

class Fulleditor {
    constructor(selectorOrElement, options = {}) {
        this.host = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;

        if (!this.host) throw new Error('Fulleditor host element was not found.');

        this.options = {
            toolbar: DEFAULT_TOOLBAR,
            placeholder: 'Start writing...',
            initialValue: '',
            allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
            maxImageSizeMB: 5,
            imageUpload: null,
            onChange: null,
            ...options
        };

        this.isSourceMode = false;
        
        this.buildUI();
        this.initManagers();
        this.bindEvents();
        
        // Initial state
        this.setHTML(this.options.initialValue);
        // Initial history snapshot
        this.historyManager.pushSnapshot();
    }

    buildUI() {
        this.host.classList.add('lw-editor-shell');

        this.toolbar = document.createElement('div');
        this.toolbar.className = 'lw-editor-toolbar';
        this.toolbar.setAttribute('role', 'toolbar');

        this.editorContainer = document.createElement('div');
        this.editorContainer.className = 'lw-editor-container';
        
        this.editor = document.createElement('div');
        this.editor.className = 'lw-editor';
        this.editor.contentEditable = 'true';
        this.editor.setAttribute('data-placeholder', this.options.placeholder);
        this.editor.setAttribute('aria-label', 'Rich text editor');
        this.editor.spellcheck = true;

        this.sourceTextarea = document.createElement('textarea');
        this.sourceTextarea.className = 'lw-editor-source';
        this.sourceTextarea.style.display = 'none';
        this.sourceTextarea.style.width = '100%';
        this.sourceTextarea.style.height = '260px';
        this.sourceTextarea.style.fontFamily = 'monospace';
        this.sourceTextarea.style.padding = '16px';
        this.sourceTextarea.style.border = 'none';
        this.sourceTextarea.style.resize = 'none';
        this.sourceTextarea.style.outline = 'none';

        this.editorContainer.appendChild(this.editor);
        this.editorContainer.appendChild(this.sourceTextarea);

        this.imageInput = document.createElement('input');
        this.imageInput.type = 'file';
        this.imageInput.accept = this.options.allowedImageTypes.join(',');
        this.imageInput.style.display = 'none';

        this.options.toolbar.forEach((action) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'lw-toolbar-btn';
            button.dataset.action = action;
            button.textContent = BUTTON_LABELS[action] || action;
            button.setAttribute('aria-label', action);
            this.toolbar.appendChild(button);
        });

        this.host.innerHTML = '';
        this.host.appendChild(this.toolbar);
        this.host.appendChild(this.editorContainer);
        this.host.appendChild(this.imageInput);
    }

    initManagers() {
        this.eventBus = new EventBus();
        this.sanitizerManager = new SanitizerManager();
        this.selectionManager = new SelectionManager(this.editor);
        this.historyManager = new HistoryManager(this.editor, this.selectionManager, this.eventBus);
        this.commandManager = new CommandManager(this.editor, this.historyManager, this.selectionManager, this.eventBus);
        this.keyboardManager = new KeyboardManager(this.editor, this.commandManager, this.eventBus);
        this.pasteProcessor = new PasteProcessor(this.editor, this.sanitizerManager, this.selectionManager, this.historyManager);
    }

    bindEvents() {
        this._boundHandleInput = this.handleInput.bind(this);
        this._boundHandleToolbarClick = this.handleToolbarClick.bind(this);
        this._boundHandleImageSelect = this.handleImageSelect.bind(this);
        this._boundHandleSourceInput = this.handleSourceInput.bind(this);

        this.toolbar.addEventListener('click', this._boundHandleToolbarClick);
        this.editor.addEventListener('input', this._boundHandleInput);
        this.sourceTextarea.addEventListener('input', this._boundHandleSourceInput);
        this.imageInput.addEventListener('change', this._boundHandleImageSelect);
        
        // Handle image paste
        this.editor.addEventListener('paste', (event) => {
            const files = Array.from(event.clipboardData?.files || []);
            const image = files.find((file) => file.type.startsWith('image/'));
            if (image) {
                event.preventDefault();
                this.insertImageFromFile(image);
            }
        });

        this.eventBus.on('promptLink', () => {
            const url = window.prompt('Enter URL');
            if (url) {
                this.commandManager.execute('link', this.normalizeUrl(url));
            }
        });
        
        this.eventBus.on('contentChanged', () => {
            if (typeof this.options.onChange === 'function') {
                this.options.onChange(this.getHTML(), this.getText());
            }
        });
    }

    handleToolbarClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        
        const action = button.dataset.action;
        
        if (action === 'source') {
            this.toggleSourceMode();
            return;
        }

        if (this.isSourceMode) return;

        if (action === 'link') {
            this.eventBus.emit('promptLink');
        } else if (action === 'image') {
            this.imageInput.click();
        } else {
            this.commandManager.execute(action);
        }
    }

    handleInput() {
        if (!this.historyManager.isMutatingHistory) {
            clearTimeout(this._inputTimeout);
            this._inputTimeout = setTimeout(() => {
                this.historyManager.pushSnapshot();
            }, 1000);
            
            this.eventBus.emit('contentChanged');
        }
    }

    handleSourceInput() {
        this.eventBus.emit('contentChanged');
    }

    async handleImageSelect() {
        const file = this.imageInput.files && this.imageInput.files[0];
        if (file) {
            await this.insertImageFromFile(file);
        }
        this.imageInput.value = '';
    }

    async insertImageFromFile(file) {
        if (!this.options.allowedImageTypes.includes(file.type)) {
            window.alert('Unsupported image type.');
            return;
        }

        const maxBytes = this.options.maxImageSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            window.alert('Image is too large.');
            return;
        }

        try {
            const imageUrl = this.options.imageUpload
                ? await this.options.imageUpload(file)
                : await this.fileToDataUrl(file);

            if (!imageUrl) return;

            this.commandManager.execute('image', imageUrl);
        } catch (error) {
            window.alert('Image upload failed.');
            console.error(error);
        }
    }

    toggleSourceMode() {
        this.isSourceMode = !this.isSourceMode;
        
        if (this.isSourceMode) {
            this.sourceTextarea.value = this.getHTML();
            this.editor.style.display = 'none';
            this.sourceTextarea.style.display = 'block';
            this.sourceTextarea.focus();
            this.toolbar.classList.add('source-mode-active');
            Array.from(this.toolbar.querySelectorAll('button')).forEach(btn => {
                if (btn.dataset.action !== 'source') btn.disabled = true;
            });
        } else {
            const newHtml = this.sanitizerManager.sanitize(this.sourceTextarea.value);
            this.editor.innerHTML = newHtml;
            this.sourceTextarea.style.display = 'none';
            this.editor.style.display = 'block';
            this.editor.focus();
            this.historyManager.pushSnapshot();
            this.eventBus.emit('contentChanged');
            this.toolbar.classList.remove('source-mode-active');
            Array.from(this.toolbar.querySelectorAll('button')).forEach(btn => {
                btn.disabled = false;
            });
        }
        this.eventBus.emit('sourceModeChanged', this.isSourceMode);
    }

    getHTML() {
        if (this.isSourceMode) {
            return this.sourceTextarea.value;
        }
        return this.sanitizerManager.sanitize(this.editor.innerHTML);
    }

    getText() {
        if (this.isSourceMode) {
            const tmp = document.createElement('div');
            tmp.innerHTML = this.sanitizerManager.sanitize(this.sourceTextarea.value);
            return tmp.textContent || '';
        }
        return this.editor.textContent || '';
    }

    setHTML(value) {
        const cleanHTML = this.sanitizerManager.sanitize(value || '');
        this.editor.innerHTML = cleanHTML;
        if (this.isSourceMode) {
            this.sourceTextarea.value = cleanHTML;
        }
        this.handleInput();
    }

    clear() {
        this.setHTML('');
        this.historyManager.pushSnapshot();
    }

    focus() {
        if (this.isSourceMode) {
            this.sourceTextarea.focus();
        } else {
            this.editor.focus();
        }
    }

    destroy() {
        this.keyboardManager.destroy();
        this.pasteProcessor.destroy();
        this.toolbar.removeEventListener('click', this._boundHandleToolbarClick);
        this.editor.removeEventListener('input', this._boundHandleInput);
        this.sourceTextarea.removeEventListener('input', this._boundHandleSourceInput);
        this.imageInput.removeEventListener('change', this._boundHandleImageSelect);
        this.host.innerHTML = '';
        this.host.classList.remove('lw-editor-shell');
    }

    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    normalizeUrl(url) {
        const trimmed = url.trim();
        if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
            return trimmed;
        }
        return `https://${trimmed}`;
    }
}

export default Fulleditor;

(function (global) {
    const DEFAULT_TOOLBAR = [
        'bold',
        'italic',
        'underline',
        'strike',
        'h2',
        'blockquote',
        'ul',
        'ol',
        'link',
        'image',
        'code',
        'undo',
        'redo'
    ];

    const BUTTON_LABELS = {
        bold: 'B',
        italic: 'I',
        underline: 'U',
        strike: 'S',
        h2: 'H2',
        blockquote: '"',
        ul: 'UL',
        ol: 'OL',
        link: 'Link',
        image: 'Image',
        code: '</>',
        undo: 'Undo',
        redo: 'Redo'
    };

    class LightweightEditor {
        constructor(selectorOrElement, options = {}) {
            this.host = typeof selectorOrElement === 'string'
                ? document.querySelector(selectorOrElement)
                : selectorOrElement;

            if (!this.host) {
                throw new Error('LightweightEditor host element was not found.');
            }

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

            this._boundHandleInput = this.handleInput.bind(this);
            this._boundHandleShortcut = this.handleShortcut.bind(this);
            this._boundHandleToolbarClick = this.handleToolbarClick.bind(this);
            this._boundHandlePaste = this.handlePaste.bind(this);

            this.build();
        }

        build() {
            this.host.classList.add('lw-editor-shell');

            this.toolbar = document.createElement('div');
            this.toolbar.className = 'lw-editor-toolbar';
            this.toolbar.setAttribute('role', 'toolbar');

            this.editor = document.createElement('div');
            this.editor.className = 'lw-editor';
            this.editor.contentEditable = 'true';
            this.editor.setAttribute('data-placeholder', this.options.placeholder);
            this.editor.setAttribute('aria-label', 'Rich text editor');
            this.editor.spellcheck = true;
            this.editor.innerHTML = this.options.initialValue;

            this.imageInput = document.createElement('input');
            this.imageInput.type = 'file';
            this.imageInput.accept = this.options.allowedImageTypes.join(',');
            this.imageInput.style.display = 'none';
            this.imageInput.addEventListener('change', () => {
                const file = this.imageInput.files && this.imageInput.files[0];
                if (file) {
                    this.insertImageFromFile(file);
                }
                this.imageInput.value = '';
            });

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
            this.host.appendChild(this.editor);
            this.host.appendChild(this.imageInput);

            this.toolbar.addEventListener('click', this._boundHandleToolbarClick);
            this.editor.addEventListener('input', this._boundHandleInput);
            this.editor.addEventListener('keydown', this._boundHandleShortcut);
            this.editor.addEventListener('paste', this._boundHandlePaste);
        }

        handleToolbarClick(event) {
            const button = event.target.closest('button[data-action]');
            if (!button) {
                return;
            }
            this.exec(button.dataset.action);
            this.editor.focus();
        }

        exec(action) {
            switch (action) {
                case 'bold':
                    document.execCommand('bold');
                    break;
                case 'italic':
                    document.execCommand('italic');
                    break;
                case 'underline':
                    document.execCommand('underline');
                    break;
                case 'strike':
                    document.execCommand('strikeThrough');
                    break;
                case 'h2':
                    document.execCommand('formatBlock', false, '<h2>');
                    break;
                case 'blockquote':
                    document.execCommand('formatBlock', false, '<blockquote>');
                    break;
                case 'ul':
                    document.execCommand('insertUnorderedList');
                    break;
                case 'ol':
                    document.execCommand('insertOrderedList');
                    break;
                case 'code':
                    document.execCommand('formatBlock', false, '<pre>');
                    break;
                case 'undo':
                    document.execCommand('undo');
                    break;
                case 'redo':
                    document.execCommand('redo');
                    break;
                case 'link':
                    this.createLink();
                    break;
                case 'image':
                    this.openImagePicker();
                    break;
                default:
                    break;
            }

            this.handleInput();
        }

        createLink() {
            const raw = window.prompt('Enter URL');
            if (!raw) {
                return;
            }

            const normalized = this.normalizeUrl(raw);
            document.execCommand('createLink', false, normalized);
        }

        openImagePicker() {
            this.imageInput.click();
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

                if (!imageUrl) {
                    return;
                }

                document.execCommand('insertImage', false, imageUrl);
                this.handleInput();
            } catch (error) {
                window.alert('Image upload failed.');
                console.error(error);
            }
        }

        handlePaste(event) {
            const files = Array.from(event.clipboardData?.files || []);
            const image = files.find((file) => file.type.startsWith('image/'));
            if (!image) {
                return;
            }

            event.preventDefault();
            this.insertImageFromFile(image);
        }

        handleShortcut(event) {
            if (!(event.metaKey || event.ctrlKey)) {
                return;
            }

            const key = event.key.toLowerCase();
            if (key === 'b') {
                event.preventDefault();
                this.exec('bold');
            }
            if (key === 'i') {
                event.preventDefault();
                this.exec('italic');
            }
            if (key === 'u') {
                event.preventDefault();
                this.exec('underline');
            }
            if (key === 'k') {
                event.preventDefault();
                this.exec('link');
            }
        }

        handleInput() {
            if (typeof this.options.onChange === 'function') {
                this.options.onChange(this.getHTML(), this.getText());
            }
        }

        getHTML() {
            return this.editor.innerHTML;
        }

        getText() {
            return this.editor.textContent || '';
        }

        setHTML(value) {
            this.editor.innerHTML = value || '';
            this.handleInput();
        }

        clear() {
            this.setHTML('');
        }

        focus() {
            this.editor.focus();
        }

        destroy() {
            this.toolbar.removeEventListener('click', this._boundHandleToolbarClick);
            this.editor.removeEventListener('input', this._boundHandleInput);
            this.editor.removeEventListener('keydown', this._boundHandleShortcut);
            this.editor.removeEventListener('paste', this._boundHandlePaste);
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

    global.LightweightEditor = LightweightEditor;
})(window);
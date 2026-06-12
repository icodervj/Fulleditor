export default class PasteProcessor {
    constructor(editorElement, sanitizerManager, selectionManager, historyManager) {
        this.editorElement = editorElement;
        this.sanitizerManager = sanitizerManager;
        this.selectionManager = selectionManager;
        this.historyManager = historyManager;

        this._handlePaste = this.handlePaste.bind(this);
        this.editorElement.addEventListener('paste', this._handlePaste);
    }

    handlePaste(event) {
        event.preventDefault();

        let content = (event.clipboardData || window.clipboardData).getData('text/html');
        const textContent = (event.clipboardData || window.clipboardData).getData('text/plain');

        if (!content && !textContent) {
            const items = (event.clipboardData || event.originalEvent.clipboardData).items;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    // Handled elsewhere or could emit an event. Returning here to allow external listeners.
                    return; 
                }
            }
            return;
        }

        if (content) {
            content = this.normalizeGarbage(content);
            content = this.sanitizerManager.sanitize(content);
        } else {
            content = this.sanitizerManager.sanitize(textContent).replace(/\n/g, '<br>');
        }

        this.selectionManager.restoreSelection();
        document.execCommand('insertHTML', false, content);
        this.historyManager.pushSnapshot();
    }

    normalizeGarbage(html) {
        let cleaned = html.replace(/<!--[\s\S]*?-->/g, '');
        cleaned = cleaned.replace(/<span[^>]*>\s*<\/span>/gi, '');
        cleaned = cleaned.replace(/<b\b[^>]*>/gi, '<strong>').replace(/<\/b>/gi, '</strong>');
        cleaned = cleaned.replace(/<i\b[^>]*>/gi, '<em>').replace(/<\/i>/gi, '</em>');
        return cleaned;
    }

    destroy() {
        this.editorElement.removeEventListener('paste', this._handlePaste);
    }
}

export default class KeyboardManager {
    constructor(editorElement, commandManager, eventBus) {
        this.editorElement = editorElement;
        this.commandManager = commandManager;
        this.eventBus = eventBus;
        this.shortcuts = new Map();

        this.registerDefaultShortcuts();
        
        this._handleKeydown = this.handleKeydown.bind(this);
        this.editorElement.addEventListener('keydown', this._handleKeydown);
    }

    registerShortcut(keyCombo, handler) {
        this.shortcuts.set(keyCombo.toLowerCase(), handler);
    }

    handleKeydown(event) {
        if (!event.metaKey && !event.ctrlKey) return;

        let key = event.key.toLowerCase();
        if (event.shiftKey) {
            key = 'shift+' + key;
        }
        
        const combo = (event.ctrlKey || event.metaKey ? 'ctrl+' : '') + key;
        
        const handler = this.shortcuts.get(combo);
        if (handler) {
            event.preventDefault();
            handler(event);
        }
    }

    registerDefaultShortcuts() {
        this.registerShortcut('ctrl+b', () => this.commandManager.execute('bold'));
        this.registerShortcut('ctrl+i', () => this.commandManager.execute('italic'));
        this.registerShortcut('ctrl+u', () => this.commandManager.execute('underline'));
        this.registerShortcut('ctrl+k', () => this.eventBus.emit('promptLink'));
        this.registerShortcut('ctrl+z', () => this.commandManager.execute('undo'));
        this.registerShortcut('ctrl+shift+z', () => this.commandManager.execute('redo'));
        this.registerShortcut('ctrl+y', () => this.commandManager.execute('redo'));
    }

    destroy() {
        this.editorElement.removeEventListener('keydown', this._handleKeydown);
    }
}

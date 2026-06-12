export default class CommandManager {
    constructor(editorElement, historyManager, selectionManager, eventBus) {
        this.editorElement = editorElement;
        this.historyManager = historyManager;
        this.selectionManager = selectionManager;
        this.eventBus = eventBus;
        this.commands = new Map();
        
        this.registerDefaultCommands();
    }

    register(name, handler) {
        this.commands.set(name, handler);
    }

    execute(name, ...args) {
        const handler = this.commands.get(name);
        if (handler) {
            this.selectionManager.restoreSelection();
            handler(...args);
            
            if (name !== 'undo' && name !== 'redo') {
                this.historyManager.pushSnapshot();
                this.eventBus.emit('contentChanged');
            }
            this.eventBus.emit('commandExecuted', { name, args });
            this.editorElement.focus();
        } else {
            console.warn(`Command ${name} not found.`);
        }
    }

    registerDefaultCommands() {
        ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].forEach(cmd => {
            const actionName = cmd === 'strikeThrough' ? 'strike' : cmd === 'insertUnorderedList' ? 'ul' : cmd === 'insertOrderedList' ? 'ol' : cmd;
            this.register(actionName, () => document.execCommand(cmd, false, null));
        });

        this.register('h2', () => document.execCommand('formatBlock', false, '<h2>'));
        this.register('blockquote', () => document.execCommand('formatBlock', false, '<blockquote>'));
        this.register('code', () => document.execCommand('formatBlock', false, '<pre>'));

        this.register('link', (url) => {
            if (url) {
                document.execCommand('createLink', false, url);
            }
        });

        this.register('image', (url) => {
            if (url) {
                document.execCommand('insertImage', false, url);
            }
        });

        this.register('undo', () => this.historyManager.undo());
        this.register('redo', () => this.historyManager.redo());
    }
}

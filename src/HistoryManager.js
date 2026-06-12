export default class HistoryManager {
    constructor(editorElement, selectionManager, eventBus, maxHistory = 100) {
        this.editorElement = editorElement;
        this.selectionManager = selectionManager;
        this.eventBus = eventBus;
        this.maxHistory = maxHistory;
        this.undoStack = [];
        this.redoStack = [];
        this.isMutatingHistory = false;
    }

    pushSnapshot() {
        if (this.isMutatingHistory) return;

        const html = this.editorElement.innerHTML;
        const offsets = this.selectionManager.saveSelectionOffsets();

        // Don't push if it's identical to the current top of the stack
        if (this.undoStack.length > 0) {
            const lastSnapshot = this.undoStack[this.undoStack.length - 1];
            if (lastSnapshot.html === html) {
                return;
            }
        }

        this.undoStack.push({ html, offsets });
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = []; // clear redo stack on new action
    }

    undo() {
        if (this.undoStack.length === 0) return;

        const currentHtml = this.editorElement.innerHTML;
        const currentOffsets = this.selectionManager.saveSelectionOffsets();

        if (this.redoStack.length === 0 || this.redoStack[this.redoStack.length - 1].html !== currentHtml) {
            this.redoStack.push({ html: currentHtml, offsets: currentOffsets });
        }

        const snapshot = this.undoStack.pop();
        this._applySnapshot(snapshot);
        
        if (snapshot.html === currentHtml && this.undoStack.length > 0) {
            const olderSnapshot = this.undoStack.pop();
            this._applySnapshot(olderSnapshot);
            this.redoStack.push(snapshot);
        }

        this.eventBus.emit('undo');
        this.eventBus.emit('contentChanged');
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const currentHtml = this.editorElement.innerHTML;
        const currentOffsets = this.selectionManager.saveSelectionOffsets();
        
        this.undoStack.push({ html: currentHtml, offsets: currentOffsets });

        const snapshot = this.redoStack.pop();
        this._applySnapshot(snapshot);

        this.eventBus.emit('redo');
        this.eventBus.emit('contentChanged');
    }

    _applySnapshot(snapshot) {
        this.isMutatingHistory = true;
        this.editorElement.innerHTML = snapshot.html;
        if (snapshot.offsets) {
            this.selectionManager.restoreSelectionOffsets(snapshot.offsets);
        }
        this.isMutatingHistory = false;
    }
}

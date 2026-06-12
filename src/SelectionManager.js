export default class SelectionManager {
    constructor(editorElement, windowObj = window) {
        this.editorElement = editorElement;
        this.window = windowObj;
        this.savedRange = null;
    }

    getSelection() {
        return this.window.getSelection();
    }

    getSelectionRange() {
        const selection = this.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (this.editorElement.contains(range.commonAncestorContainer)) {
                return range;
            }
        }
        return null;
    }

    saveSelection() {
        const range = this.getSelectionRange();
        if (range) {
            this.savedRange = range.cloneRange();
        }
    }

    restoreSelection() {
        if (this.savedRange) {
            const selection = this.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.savedRange);
        } else {
            // Fallback to end of editor
            this.editorElement.focus();
            const range = document.createRange();
            range.selectNodeContents(this.editorElement);
            range.collapse(false);
            const selection = this.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    setSelectionRange(range) {
        if (range) {
            const selection = this.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            this.saveSelection();
        }
    }

    saveSelectionOffsets() {
        const range = this.getSelectionRange();
        if (!range) return null;
        
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(this.editorElement);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const start = preSelectionRange.toString().length;
        const end = start + range.toString().length;
        return { start, end };
    }

    restoreSelectionOffsets(offsets) {
        if (!offsets) return;
        
        let charIndex = 0;
        let startNode, startOffset, endNode, endOffset;

        const walk = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const len = node.length;
                if (!startNode && charIndex + len >= offsets.start) {
                    startNode = node;
                    startOffset = offsets.start - charIndex;
                }
                if (!endNode && charIndex + len >= offsets.end) {
                    endNode = node;
                    endOffset = offsets.end - charIndex;
                }
                charIndex += len;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    walk(node.childNodes[i]);
                    if (startNode && endNode) break;
                }
            }
        };
        
        walk(this.editorElement);

        if (startNode && endNode) {
            const range = this.window.document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            const selection = this.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            this.savedRange = range.cloneRange();
        }
    }
}

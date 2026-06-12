import DOMPurify from 'dompurify';

export default class SanitizerManager {
    constructor(options = {}) {
        this.options = {
            ALLOWED_TAGS: [
                'b', 'i', 'u', 's', 'em', 'strong', 'strike',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'blockquote', 'pre', 'code',
                'ul', 'ol', 'li',
                'a', 'img', 'br', 'span', 'div'
            ],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            ...options
        };
    }

    sanitize(html) {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: this.options.ALLOWED_TAGS,
            ALLOWED_ATTR: this.options.ALLOWED_ATTR,
            ALLOWED_URI_REGEXP: this.options.ALLOWED_URI_REGEXP,
            KEEP_CONTENT: true,
            RETURN_DOM_FRAGMENT: false,
            RETURN_DOM: false
        });
    }
}

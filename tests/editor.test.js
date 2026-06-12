/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import SanitizerManager from '../src/SanitizerManager';
import PasteProcessor from '../src/PasteProcessor';

describe('SanitizerManager', () => {
    let sanitizer;

    beforeEach(() => {
        sanitizer = new SanitizerManager();
    });

    it('removes script tags', () => {
        const html = '<script>alert("xss")</script><p>Hello</p>';
        const clean = sanitizer.sanitize(html);
        expect(clean).not.toContain('<script>');
        expect(clean).toContain('<p>Hello</p>');
    });

    it('removes javascript: protocols', () => {
        const html = '<a href="javascript:alert(1)">Click</a>';
        const clean = sanitizer.sanitize(html);
        expect(clean).not.toContain('javascript:');
        expect(clean).toContain('<a>Click</a>');
    });

    it('removes inline event handlers', () => {
        const html = '<img src="x" onerror="alert(1)">';
        const clean = sanitizer.sanitize(html);
        expect(clean).not.toContain('onerror');
    });
});

describe('PasteProcessor', () => {
    let pasteProcessor;

    beforeEach(() => {
        const mockSanitizer = new SanitizerManager();
        const dummyElement = document.createElement('div');
        pasteProcessor = new PasteProcessor(dummyElement, mockSanitizer, {}, {});
    });

    it('normalizes <b> to <strong>', () => {
        const html = '<b>Bold text</b>';
        const normalized = pasteProcessor.normalizeGarbage(html);
        expect(normalized).toContain('<strong>Bold text</strong>');
    });

    it('normalizes <i> to <em>', () => {
        const html = '<i>Italic text</i>';
        const normalized = pasteProcessor.normalizeGarbage(html);
        expect(normalized).toContain('<em>Italic text</em>');
    });

    it('removes empty spans', () => {
        const html = '<span style="color: red;"> </span><p>Content</p>';
        const normalized = pasteProcessor.normalizeGarbage(html);
        expect(normalized).not.toContain('<span');
        expect(normalized).toContain('<p>Content</p>');
    });
});

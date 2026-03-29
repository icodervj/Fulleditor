# Lightweight Editor

A lightweight, framework-free WYSIWYG editor that can be embedded in different websites.

## Features

- Small footprint and no dependencies
- Rich text commands: bold, italic, underline, strike
- Headings, blockquotes, lists, and code blocks
- Link insertion with URL normalization
- Image insertion from file picker and clipboard paste
- Custom async image upload handler
- Keyboard shortcuts: Ctrl/Cmd + B, I, U, K
- Public API: getHTML, setHTML, getText, clear, focus, destroy

## Use This Repo On Any Website

After publishing this repository to GitHub, websites can consume the files in two simple ways.

### Option 1: Copy Files Into Your Project

1. Copy editor.js and editor.css into your website.
2. Include them in your page.
3. Initialize the editor.

```html
<link rel="stylesheet" href="editor.css">
<script src="editor.js"></script>

<div id="editor"></div>
<script>
    const editor = new LightweightEditor('#editor', {
        placeholder: 'Write something...'
    });
</script>
```

### Option 2: Use GitHub CDN (jsDelivr)

Replace USER and REPO after publishing:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/icodervj/fulleditor/editor.css">
<script src="https://cdn.jsdelivr.net/gh/icodervj/fulleditor/editor.js"></script>

<div id="editor"></div>
<script>
    const editor = new LightweightEditor('#editor');
</script>
```

For production, pin to a release tag:

```text
https://cdn.jsdelivr.net/gh/USER/REPO@v1.0.0/editor.js
```

## Image Upload

By default, selected images are embedded as Base64 data URLs.

For production, provide imageUpload(file) that uploads to your backend or cloud storage and returns a final image URL.

```javascript
const editor = new LightweightEditor('#editor', {
    imageUpload: async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        return data.url;
    }
});
```

## Configuration

Supported options:

- toolbar: Array of toolbar action keys
- placeholder: Placeholder string
- initialValue: Initial HTML content
- allowedImageTypes: Allowed MIME types
- maxImageSizeMB: Upload size limit
- imageUpload: Async function for image upload
- onChange: Callback with html and plain text

Default toolbar actions:

```text
bold, italic, underline, strike, h2, blockquote, ul, ol, link, image, code, undo, redo
```

## API

```javascript
editor.getHTML();
editor.getText();
editor.setHTML('<p>Hello</p>');
editor.clear();
editor.focus();
editor.destroy();
```

## Local Demo

Open index.html in a browser.

## npm Package

Install:

```bash
npm install lightweight-editor
```

Use from CDN via npm package (version-pinned):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lightweight-editor@1.0.0/dist/editor.min.css">
<script src="https://cdn.jsdelivr.net/npm/lightweight-editor@1.0.0/dist/editor.min.js"></script>
```

Build minified bundle locally:

```bash
npm install
npm run build
```

Build output:

```text
dist/editor.min.js
dist/editor.min.css
```

## License

MIT
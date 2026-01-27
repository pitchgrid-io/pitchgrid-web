import { tick } from 'svelte';
import {marked} from 'marked';
import markedKatex from "marked-katex-extension";
import type {MarkedKatexOptions} from "marked-katex-extension";
import ABCJS from 'abcjs';
import mermaid from 'mermaid';

const options:MarkedKatexOptions = {
    nonStandard: true,
    output: "mathml",
    throwOnError: false,
};
marked.use(markedKatex(options));

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    flowchart: {
        htmlLabels: true,
        curve: 'basis'
    }
});

var renderer = new marked.Renderer();
renderer.image = function(info) {
    let href = info.href;
    if (!href.startsWith('/')) {
        href = `/docs/${href}`;
    }
    let size = '';
    if (info.title) {
        var sizeParts = info.title.split('x');
        if (sizeParts[1]) {
            size = 'width=' + sizeParts[0] + ' height=' + sizeParts[1];
        } else {
            size = 'width=' + sizeParts[0];
        }
    }
    return `<img src="${href}" alt="${info.text}" ${size}>`;
}
var renderer_link = renderer.link;
renderer.link = function(options) {
    var href = options.href;
    if (href.startsWith('docs/')) {
        return `<a href="${href}" download>${options.text}</a>`;
    }
    return renderer_link.call(this, options);
    
}
marked.use({renderer});

export function parseMarkdown(md: string) {
    let tokens = marked.lexer(md);
    let mermaidCounter = 0;
    
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i] as any;
        if (token.type === "code" && token.lang === "music-abc") {
            (async () => {
                var abc = token.text;
                await tick();
                ABCJS.renderAbc(`abcjs-${i}`, abc);
            })();
            token.type = "html";
            token.text = `<div id='abcjs-${i}'></div>`; 
        } else if (token.type === "code" && token.lang === "mermaid") {
            // Use mermaid's built-in class-based rendering
            const code = token.text;
            token.type = "html";
            token.text = `<div class="mermaid-diagram"><pre class="mermaid">${escapeHtml(code)}</pre></div>`;
            mermaidCounter++;
        }
    }
    
    const html = marked.parser(tokens);
    
    // Let mermaid find and render all .mermaid elements after DOM update
    if (mermaidCounter > 0) {
        (async () => {
            await tick();
            await new Promise(r => setTimeout(r, 200));
            try {
                await mermaid.run({ querySelector: '.mermaid' });
            } catch (error: any) {
                console.error('Mermaid run error:', error);
            }
        })();
    }
    
    return html;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

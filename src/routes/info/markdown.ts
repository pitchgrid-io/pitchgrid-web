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

// Initialize mermaid with better configuration
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#f0a500',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#f0a500',
        lineColor: '#ffffff',
        secondaryColor: '#1a1a2e',
        tertiaryColor: '#16213e',
        background: '#1a1a2e',
        mainBkg: '#1a1a2e',
        nodeBorder: '#f0a500',
        clusterBkg: 'rgba(240, 165, 0, 0.1)'
    },
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
    // walk through the tokens and identify code blocks with lang="abc" or "mermaid". parse them with respective parsers
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i] as any;
        if (token.type === "code" && token.lang === "music-abc") {
            
            (async () => {
                var abc = token.text;
                await tick();
                ABCJS.renderAbc(`abcjs-${i}`, abc);
            })();
            token.type = "html";
            token.text = `<div id='abcjs-${i}' ></div>`; 
        } else if (token.type === "code" && token.lang === "mermaid") {
            let mermaidSvg = '';
            try {
                // Render mermaid synchronously during parse
                const renderResult = mermaid.render(`mermaid-${i}`, token.text);
                if (renderResult && typeof renderResult === 'object' && 'svg' in renderResult) {
                    mermaidSvg = renderResult.svg;
                } else if (typeof renderResult === 'string') {
                    mermaidSvg = renderResult;
                } else {
                    mermaidSvg = '<div class="error">Mermaid render failed: unexpected result type</div>';
                }
            } catch (error: any) {
                console.error('Mermaid render error:', error);
                mermaidSvg = `<div class="error">Mermaid diagram error: ${error.message}</div>`;
            }
            token.type = "html";
            token.text = `<div class="mermaid-diagram">${mermaidSvg}</div>`; 
        }
    }
    return marked.parser(tokens);
}
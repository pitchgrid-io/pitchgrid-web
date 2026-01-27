<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { goto } from '$app/navigation';

    /** @type {import('./$types').LayoutData} */
    export let data;
    let activeTab = 0;
    let valid = true;

    let menuitems:string[] = ['PitchGrid', 'ScaleMapper', 'MicroExquis', 'PitchGridMapper', 'plugin-user-manual'];
    
    const labelMapping: {[key: string]: string} = {
        'PitchGrid': 'The PitchGrid Concept',
        'plugin-user-manual': 'Plugin User Manual',
        'MicroExquis': 'MicroExquis Guide',
        'ScaleMapper': 'Scale Mapper',
        'PitchGridMapper': 'PitchGrid Mapper'
    };

    function selectTab(index: number) {
        activeTab = index;
        goto(`/info/${menuitems[index]}`);
    }

    onMount(async () => {
        if (!data.page || data.page === '' || data.page === '/') {
            await tick();
            activeTab = 0;
            goto(`/info/PitchGrid`);
            return;
        }
        let pageIndex = menuitems.findIndex((item) => item === data.page);
        if (pageIndex === -1) {
            valid = false;
            return;
        }
        await tick();
        activeTab = pageIndex;
    });
</script>

{#if valid}
<div class="info-layout">
    <div class="tabs-bar">
        <div class="tabs-container">
            {#each menuitems as item, i}
                <button
                    class="tab"
                    class:active={activeTab === i}
                    on:click={() => selectTab(i)}
                >
                    {labelMapping[item] || item}
                </button>
            {/each}
        </div>
    </div>
    <div class="info-content">
        <slot></slot>
    </div>
</div>
{/if}
{#if !valid}
    <div class="info-layout">
        <div class="info-content">
            <h1>404 Not Found</h1>
        </div>
    </div>
{/if}

<style>
    .info-layout {
        background: #ffffff;
        color: #1a1a2e;
        min-height: calc(100vh - 65px);
    }

    .tabs-bar {
        background: #f5f5f5;
        border-bottom: 2px solid #FFAB00;
        padding: 0;
        overflow-x: auto;
    }

    .tabs-container {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        gap: 0;
        padding: 0 1rem;
    }

    .tab {
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        padding: 0.85rem 1.25rem;
        font-size: 0.9rem;
        font-weight: 500;
        color: #555;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
    }

    .tab:hover {
        color: #1a1a2e;
        background: rgba(255, 171, 0, 0.08);
    }

    .tab.active {
        color: #d48900;
        border-bottom-color: #FFAB00;
        font-weight: 600;
    }

    .info-content {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        line-height: 1.8;
    }

    /* Override global dark styles for info area */
    :global(.info-layout a) {
        color: #c07800;
    }

    :global(.info-layout a:hover) {
        color: #FFAB00;
    }

    :global(.info-layout h1) {
        color: #1a1a2e;
        font-size: 2rem;
        margin-top: 1rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid #FFAB00;
        padding-bottom: 0.5rem;
    }

    :global(.info-layout h2) {
        color: #1a1a2e;
        font-size: 1.5rem;
        margin-top: 2rem;
        margin-bottom: 0.75rem;
    }

    :global(.info-layout h3) {
        color: #333;
        font-size: 1.25rem;
        margin-top: 1.5rem;
    }

    :global(.info-layout p) {
        color: #333;
        margin-bottom: 1rem;
    }

    :global(.info-layout img) {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 1rem 0;
    }

    :global(.info-layout code) {
        background: #f0f0f0;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-size: 0.9em;
        color: #c07800;
    }

    :global(.info-layout pre) {
        background: #1a1a2e;
        color: #e0e0e0;
        padding: 1rem;
        border-radius: 8px;
        overflow-x: auto;
    }

    :global(.info-layout pre code) {
        background: none;
        color: inherit;
        padding: 0;
    }

    :global(.info-layout table) {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
    }

    :global(.info-layout th),
    :global(.info-layout td) {
        border: 1px solid #ddd;
        padding: 0.5rem 0.75rem;
        text-align: left;
    }

    :global(.info-layout th) {
        background: #f5f5f5;
        font-weight: 600;
    }

    :global(.info-layout blockquote) {
        border-left: 4px solid #FFAB00;
        margin: 1rem 0;
        padding: 0.5rem 1rem;
        background: #fffbf0;
        color: #555;
    }

    :global(.info-layout .mermaid-diagram) {
        display: block;
        width: 100%;
        margin: 20px 0;
        background: #fafafa;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 20px;
        box-sizing: border-box;
        overflow-x: auto;
    }

    :global(.info-layout .mermaid-diagram pre.mermaid) {
        display: block;
        width: 100%;
        margin: 0;
        padding: 0;
        background: none;
        overflow: visible;
    }

    :global(.info-layout .mermaid-diagram svg) {
        display: block;
        width: 100% !important;
        max-width: 100% !important;
        height: auto;
    }
    
    :global(.info-layout .error) {
        color: #cc0000;
        background: #fff0f0;
        padding: 10px;
        border-radius: 4px;
        text-align: center;
    }

    @media (max-width: 768px) {
        .tabs-container {
            padding: 0 0.5rem;
        }

        .tab {
            padding: 0.75rem 0.75rem;
            font-size: 0.8rem;
        }

        .info-content {
            padding: 1rem;
        }
    }
</style>

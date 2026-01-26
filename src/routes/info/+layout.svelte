<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { goto } from '$app/navigation';
    import { SvelteUIProvider, Header, Tabs, Space, Container } from '@svelteuidev/core';

    /** @type {import('./$types').LayoutData} */
    export let data;
    let activeTab = 0;
    let valid = true;

    let menuitems:string[] = ['PitchGrid', 'ScaleMapper', 'MicroExquis', 'plugin-user-manual', 'The PitchGrid - Doing Microtonality with Structure'];
    
    // Mapping of file names to display names
    const labelMapping: {[key: string]: string} = {
        'PitchGrid': 'The PitchGrid Concept',
        'plugin-user-manual': 'Plugin User Manual',
        'MicroExquis': 'MicroExquis Guide',
        'ScaleMapper': 'Scale Mapper',
        'The PitchGrid - Doing Microtonality with Structure': 'Microtonality with Structure'
    };
    function loadTab(event: CustomEvent) {
        goto(`/info/${menuitems[event.detail.index]}`);
    }

    onMount(async () => {
        if (!data.page || data.page === ''|| data.page === '/') {
            await tick();
            activeTab = 0;
            goto(`/info/PitchGrid`);
            return;
        }
        let pageIndex = menuitems.findIndex((item) => item === data.page);
        if(pageIndex === -1) {
            valid = false;
            return;
        }
        await tick();
        activeTab = pageIndex;
        goto(`/info/${data.page}`);
    });
</script>

<SvelteUIProvider 
    withNormalizeCSS 
    withGlobalStyles
    override={{
        backgroundColor:'#1a1a2e',  
        colorScheme: 'dark'
    }}
>   
    {#if valid}
    <Header height="60px" fixed style="background: #1a1a2e; border-bottom: 2px solid #f0a500; box-shadow: 0 2px 10px rgba(240, 165, 0, 0.2);">
        {#key menuitems}
        <div style="padding: 8px 24px;">
            <Tabs 
                bind:active={activeTab} 
                on:change={loadTab}
                override={{
                    tabsListTabActive: {
                        color: '#f0a500',
                        borderBottomColor: '#f0a500',
                        backgroundColor: 'rgba(240, 165, 0, 0.1)'
                    },
                    tabsListTab: {
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 500,
                        padding: '12px 20px',
                        transition: 'all 0.2s ease',
                        borderBottom: '2px solid transparent'
                    }
                }}
            >
                {#each menuitems as item}
                    <Tabs.Tab label={labelMapping[item] || item}></Tabs.Tab>
                {/each}
            </Tabs>
        </div>
        {/key}
    </Header>
    <Space h={70} />
    <Container>
        <slot></slot>
    </Container>
    {/if}
    {#if !valid}
        <div style="margin: 20px; color: #ffffff;">
            <h1><img src="/favicon.svg" alt="" style="width:60px"/> 404 Not Found</h1>
        </div>
    {/if}

</SvelteUIProvider>

<style>
    :global(body) {
        background-color: #1a1a2e !important;
        color: #ffffff !important;
    }
    
    :global(.mermaid-diagram) {
        display: flex;
        justify-content: center;
        margin: 20px 0;
        background: rgba(240, 165, 0, 0.05);
        border-radius: 8px;
        padding: 20px;
    }
    
    :global(.mermaid-diagram svg) {
        max-width: 100%;
        height: auto;
    }
    
    :global(.error) {
        color: #ff6b6b;
        background: rgba(255, 107, 107, 0.1);
        padding: 10px;
        border-radius: 4px;
        text-align: center;
    }
</style>
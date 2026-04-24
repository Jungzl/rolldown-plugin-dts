<script lang="ts">
import type { Snippet } from 'svelte'

const { bar, children }: { bar: string; children: Snippet } = $props()

const foo = $state('bar')
</script>

<h1>{foo}: {bar}</h1>
<main>{@render children()}</main>

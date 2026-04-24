<script lang="ts">
import Comp from './Comp.svelte'

export let title: string
</script>

<h2>{title}</h2>
<Comp foo="bar"/>

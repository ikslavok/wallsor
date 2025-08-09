<script lang="ts">
	import ExcalidrawCanvas from '$lib/components/excalidraw-canvas.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const wall = data.wall;
</script>

<!-- Clean Excalidraw Canvas - Full Screen -->
<ExcalidrawCanvas 
	wallId={wall.wall_id} 
	wallName={wall.name}
	wallSlug={wall.slug}
	wallCreatedAt={wall.created_at}
	wallLastOpenedAt={wall.last_opened_at}
/>
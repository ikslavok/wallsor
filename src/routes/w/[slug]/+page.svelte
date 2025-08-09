<script lang="ts">
	import { Info } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Dialog from '$lib/components/ui/dialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let showInfo = $state(false);

	const wall = data.wall;
</script>

<div class="min-h-screen bg-gray-100">
	<!-- Info Icon - Top Right -->
	<div class="fixed right-4 top-4 z-10">
		<Button
			onclick={() => showInfo = true}
			variant="ghost"
			size="icon"
			class="h-10 w-10 rounded-full bg-white shadow-md hover:bg-gray-50"
		>
			<Info class="h-5 w-5 text-gray-600" />
		</Button>
	</div>

	<!-- Empty Wall Canvas -->
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center text-gray-400">
			<!-- This is where wall content will go -->
			<p class="text-lg">Your wall is empty</p>
			<p class="text-sm mt-2">Start creating something amazing!</p>
		</div>
	</div>

	<!-- Info Dialog -->
	<Dialog
		bind:open={showInfo}
		title={wall.name}
		description={wall.location_name ? `📍 ${wall.location_name}` : 'Wall Information'}
	>
		<div class="space-y-3 text-sm">
			<div>
				<span class="font-medium text-gray-700">URL:</span>
				<span class="ml-2 text-gray-600">/w/{wall.slug}</span>
			</div>
			
			<div>
				<span class="font-medium text-gray-700">Created:</span>
				<span class="ml-2 text-gray-600">{new Date(wall.created_at).toLocaleDateString()}</span>
			</div>
			
			{#if wall.last_opened_at}
				<div>
					<span class="font-medium text-gray-700">Last opened:</span>
					<span class="ml-2 text-gray-600">{new Date(wall.last_opened_at).toLocaleDateString()}</span>
				</div>
			{/if}
			
			<div class="border-t pt-3">
				<a
					href="/"
					class="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
				>
					← Back to all walls
				</a>
			</div>
		</div>
	</Dialog>
</div>
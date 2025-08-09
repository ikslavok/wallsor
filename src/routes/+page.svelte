<script lang="ts">
	import { Search, Plus } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import CreateWallModal from '$lib/components/create-wall-modal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let showCreateModal = $state(false);
	let sortBy = $state<'standard' | 'name' | 'location'>('standard');

	let walls = $state(data.walls);

	let filteredWalls = $derived(
		walls.filter(wall => 
			wall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(wall.location_name && wall.location_name.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	let sortedWalls = $derived(() => {
		const sorted = [...filteredWalls];
		switch (sortBy) {
			case 'name':
				return sorted.sort((a, b) => a.name.localeCompare(b.name));
			case 'location':
				return sorted.sort((a, b) => 
					(a.location_name || '').localeCompare(b.location_name || '')
				);
			case 'standard':
			default:
				return sorted.sort((a, b) => 
					new Date(b.last_opened_at || b.created_at).getTime() - 
					new Date(a.last_opened_at || a.created_at).getTime()
				);
		}
	});

	function handleCreateClick() {
		showCreateModal = true;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Floating create button -->
	<Button
		onclick={handleCreateClick}
		variant="default"
		size="icon"
		class="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
	>
		<Plus class="h-6 w-6" />
	</Button>

	<div class="container mx-auto px-4 py-12">
		<!-- Header with search -->
		<div class="mb-12 text-center">
			<h1 class="mb-8 text-4xl font-bold text-gray-900">Wallsor</h1>
			
			<div class="mx-auto max-w-2xl">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
					<Input
						bind:value={searchQuery}
						placeholder="Search walls by name or location..."
						class="h-12 pl-10 text-base"
					/>
				</div>
			</div>
		</div>

		<!-- Sort options -->
		<div class="mb-6 flex justify-center gap-2">
			<Button
				onclick={() => sortBy = 'standard'}
				variant={sortBy === 'standard' ? 'default' : 'outline'}
				size="sm"
			>
				Last Opened
			</Button>
			<Button
				onclick={() => sortBy = 'name'}
				variant={sortBy === 'name' ? 'default' : 'outline'}
				size="sm"
			>
				Name
			</Button>
			<Button
				onclick={() => sortBy = 'location'}
				variant={sortBy === 'location' ? 'default' : 'outline'}
				size="sm"
			>
				Location
			</Button>
		</div>

		<!-- Wall gallery -->
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each sortedWalls() as wall (wall.wall_id)}
				<a
					href="/w/{wall.slug}"
					class="group block overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
				>
					<div class="aspect-[16/10] bg-gray-100"></div>
					<div class="p-4">
						<h3 class="font-semibold text-gray-900 group-hover:text-blue-600">
							{wall.name}
						</h3>
						{#if wall.location_name}
							<p class="mt-1 text-sm text-gray-500">{wall.location_name}</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>

		{#if sortedWalls().length === 0}
			<div class="mt-12 text-center">
				<p class="text-gray-500">No walls found matching your search.</p>
			</div>
		{/if}
	</div>

	<!-- Create Wall Modal -->
	<CreateWallModal bind:open={showCreateModal} />
</div>

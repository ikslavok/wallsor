<script lang="ts">
	import { Search, Plus, Map, User } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import CreateWallModal from '$lib/components/create-wall-modal.svelte';
	import WallMap from '$lib/components/wall-map.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let showCreateModal = $state(false);
	let viewMode = $state<'gallery' | 'map'>('gallery');
	let sortBy = $state<'standard' | 'name'>('standard');

	let walls = $state(data.walls);

	let filteredWalls = $derived(
		walls.filter(wall => 
			wall.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let sortedWalls = $derived(() => {
		const sorted = [...filteredWalls];
		switch (sortBy) {
			case 'name':
				return sorted.sort((a, b) => a.name.localeCompare(b.name));
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

	function handleProfileClick() {
		window.location.href = '/user';
	}

	function handleMapClick() {
		viewMode = 'map';
	}

	function handleGalleryClick() {
		viewMode = 'gallery';
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
		<div class="mb-12 text-center relative">
			<!-- Profile button - positioned absolutely in top-right -->
			<Button
				onclick={handleProfileClick}
				variant="outline"
				size="icon"
				class="absolute top-0 right-0 w-10 h-10 rounded-full"
			>
				<User class="h-5 w-5" />
			</Button>

			<h1 class="mb-8 text-4xl font-bold text-gray-900">Wallsor</h1>
			
			<div class="mx-auto max-w-2xl">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
					<Input
						bind:value={searchQuery}
						placeholder="Search for walls..."
						class="h-12 pl-10 text-base"
					/>
				</div>
			</div>
		</div>

		<!-- View mode and sort options -->
		<div class="mb-6 flex justify-center gap-2">
			{#if viewMode === 'gallery'}
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
			{:else}
				<Button
					onclick={handleGalleryClick}
					variant="outline"
					size="sm"
				>
					Gallery
				</Button>
			{/if}
			<Button
				onclick={handleMapClick}
				variant={viewMode === 'map' ? 'default' : 'outline'}
				size="sm"
			>
				<Map class="h-4 w-4 mr-2" />
				Map
			</Button>
		</div>

		<!-- Content Area -->
		{#if viewMode === 'gallery'}
			<!-- Wall gallery -->
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each sortedWalls() as wall (wall.wall_id)}
					<a
						href="/w/{wall.slug}"
						class="group block overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
					>
						<div class="aspect-[16/10] bg-gray-100"></div>
						<div class="p-4">
							<h3 class="font-semibold text-gray-900 group-hover:text-green-600">
								{wall.name}
							</h3>
						</div>
					</a>
				{/each}
			</div>

			{#if sortedWalls().length === 0}
				<div class="mt-12 text-center">
					<p class="text-gray-500">No walls found matching your search.</p>
				</div>
			{/if}
		{:else}
			<!-- Wall map view -->
			<div class="w-full overflow-hidden" style="height: calc(100vh - 280px);">
				<WallMap walls={filteredWalls} viewMode="inline" />
			</div>
		{/if}
	</div>

	<!-- Create Wall Modal -->
	<CreateWallModal bind:open={showCreateModal} />
</div>

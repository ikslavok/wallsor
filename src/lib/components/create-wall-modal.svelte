<script lang="ts">
	import Dialog from '$lib/components/ui/dialog.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import PlacesAutocomplete from '$lib/components/places-autocomplete.svelte';
	import { generateSlug } from '$lib/utils/slug';

	type PlaceDetails = {
		place_id: string;
		name?: string;
		formatted_address?: string;
		location?: {
			lat: number;
			lng: number;
		};
		types?: string[];
	};

	type Props = {
		open?: boolean;
		onclose?: () => void;
	};

	let { open = $bindable(false), onclose }: Props = $props();

	let name = $state('');
	let location = $state('');
	let selectedPlace: PlaceDetails | null = $state(null);
	let loading = $state(false);


	let slug = $derived(generateSlug(name));

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!name.trim()) {
			return;
		}

		loading = true;

		try {
			const wallData: any = {
				name: name.trim()
			};

			if (selectedPlace) {
				wallData.location_name = selectedPlace.formatted_address;
				wallData.location_place_id = selectedPlace.place_id;
				if (selectedPlace.location) {
					wallData.location_lat = selectedPlace.location.lat;
					wallData.location_lng = selectedPlace.location.lng;
				}
			} else if (location.trim()) {
				wallData.location_name = location.trim();
			}

			const response = await fetch('/api/walls', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(wallData)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create wall');
			}

			const wall = await response.json();
			
			// Reset form
			name = '';
			location = '';
			selectedPlace = null;
			
			// Close modal
			if (onclose) onclose();
			else open = false;
			
			// Redirect to the new wall page
			window.location.href = `/w/${wall.slug}`;
		} catch (error) {
			console.error('Error creating wall:', error);
			loading = false;
		}
	}

	function handleClose() {
		name = '';
		location = '';
		selectedPlace = null;
		if (onclose) onclose();
		else open = false;
	}

	function handlePlaceSelect(place: PlaceDetails) {
		selectedPlace = place;
		location = place.formatted_address || place.name || '';
	}
</script>

<Dialog
	bind:open
	onclose={handleClose}
	title="Create New Wall"
	description="Give your wall a name and location to get started."
>
	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<Label for="name">Name *</Label>
			<Input
				id="name"
				bind:value={name}
				placeholder="Enter wall name..."
				required
				disabled={loading}
				class="mt-1"
			/>
			{#if slug}
				<p class="mt-1 text-xs text-gray-500">
					URL: /w/{slug}
				</p>
			{/if}
		</div>

		<div>
			<Label for="location">Location</Label>
			<PlacesAutocomplete
				bind:value={location}
				onplaceselect={handlePlaceSelect}
				placeholder="Search for a location..."
				disabled={loading}
				class="mt-1"
			/>
			<p class="mt-1 text-xs text-gray-500">
				Search for a specific place or address
			</p>
		</div>

		<div class="flex justify-end gap-2 pt-4">
			<Button
				type="button"
				variant="outline"
				onclick={handleClose}
				disabled={loading}
			>
				Cancel
			</Button>
			<Button
				type="submit"
				disabled={loading || !name.trim()}
			>
				{loading ? 'Creating...' : 'Create Wall'}
			</Button>
		</div>
	</form>
</Dialog>
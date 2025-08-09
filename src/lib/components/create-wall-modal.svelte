<script lang="ts">
	import Dialog from '$lib/components/ui/dialog.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import PlacesAutocomplete from '$lib/components/places-autocomplete.svelte';
	import { generateSlug } from '$lib/utils/slug';

	type Props = {
		open?: boolean;
		onclose?: () => void;
	};

	let { open = $bindable(false), onclose }: Props = $props();

	let name = $state('');
	let location = $state('');
	let locationDetails = $state<any>(null);
	let loading = $state(false);

	let slug = $derived(generateSlug(name));

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!name.trim()) {
			return;
		}

		loading = true;

		try {
			const wallData = {
				name: name.trim(),
				location_name: locationDetails?.formatted_address || location || undefined,
				location_place_id: locationDetails?.place_id || undefined,
				location_lat: locationDetails?.location?.lat || undefined,
				location_lng: locationDetails?.location?.lng || undefined
			};

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
			locationDetails = null;
			
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
		locationDetails = null;
		if (onclose) onclose();
		else open = false;
	}

	function handlePlaceSelect(details: any) {
		locationDetails = details;
	}
</script>

<Dialog
	bind:open
	onclose={handleClose}
	title="Create New Wall"
	description="Give your wall a name to get started."
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
				placeholder="Enter location..."
				disabled={loading}
				class="mt-1"
			/>
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
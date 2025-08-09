<script lang="ts">
	import { MapPin, ChevronDown } from 'lucide-svelte';
	import Input from '$lib/components/ui/input.svelte';
	import { debounce } from '$lib/utils/debounce';

	type PlacePrediction = {
		place_id: string;
		description: string;
		main_text?: string;
		secondary_text?: string;
		types?: string[];
	};

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
		value?: string;
		placeholder?: string;
		onplaceselect?: (details: PlaceDetails) => void;
		disabled?: boolean;
		class?: string;
	};

	let {
		value = $bindable(''),
		placeholder = 'Search for a location...',
		onplaceselect,
		disabled = false,
		class: className
	}: Props = $props();

	let predictions: PlacePrediction[] = $state([]);
	let showDropdown = $state(false);
	let loading = $state(false);
	let selectedIndex = $state(-1);

	const debouncedSearch = debounce(async (input: string) => {
		if (input.length < 2) {
			predictions = [];
			showDropdown = false;
			return;
		}

		loading = true;
		try {
			const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
			const data = await response.json();
			predictions = data.predictions || [];
			showDropdown = predictions.length > 0;
			selectedIndex = -1;
		} catch (error) {
			console.error('Error fetching places:', error);
			predictions = [];
			showDropdown = false;
		} finally {
			loading = false;
		}
	}, 300);

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		value = input.value;
		debouncedSearch(value);
	}

	async function selectPlace(prediction: PlacePrediction) {
		value = prediction.description;
		showDropdown = false;
		predictions = [];

		if (onplaceselect) {
			try {
				const response = await fetch(`/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`);
				const details = await response.json();
				onplaceselect(details);
			} catch (error) {
				console.error('Error fetching place details:', error);
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!showDropdown || predictions.length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, predictions.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < predictions.length) {
					selectPlace(predictions[selectedIndex]);
				}
				break;
			case 'Escape':
				showDropdown = false;
				selectedIndex = -1;
				break;
		}
	}

	function handleBlur() {
		// Delay hiding dropdown to allow clicks on items
		setTimeout(() => {
			showDropdown = false;
			selectedIndex = -1;
		}, 200);
	}

	function handleFocus() {
		if (predictions.length > 0) {
			showDropdown = true;
		}
	}
</script>

<div class="relative {className}">
	<div class="relative">
		<MapPin class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
		<Input
			{value}
			{placeholder}
			{disabled}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			onfocus={handleFocus}
			class="pl-10 pr-10"
		/>
		{#if loading}
			<div class="absolute right-3 top-1/2 -translate-y-1/2">
				<div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
			</div>
		{:else if showDropdown}
			<ChevronDown class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
		{/if}
	</div>

	{#if showDropdown && predictions.length > 0}
		<div class="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
			<ul class="max-h-60 overflow-auto py-1">
				{#each predictions as prediction, index}
					<li>
						<button
							type="button"
							onclick={() => selectPlace(prediction)}
							class="flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 {selectedIndex === index ? 'bg-gray-50' : ''}"
						>
							<MapPin class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
							<div class="flex-1">
								<div class="font-medium text-gray-900">
									{prediction.main_text || prediction.description}
								</div>
								{#if prediction.secondary_text}
									<div class="text-gray-500">
										{prediction.secondary_text}
									</div>
								{/if}
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
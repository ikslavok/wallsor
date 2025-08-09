<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Users, Eye, TrendingUp } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	
	type Wall = {
		wall_id: string;
		name: string;
		slug: string;
		location_lat?: number;
		location_lng?: number;
		location_name?: string;
		created_at: string;
		last_opened_at?: string;
	};

	type Props = {
		walls: Wall[];
		open?: boolean;
		onclose?: () => void;
		viewMode?: 'modal' | 'inline';
	};

	let { walls, open = $bindable(false), onclose, viewMode = 'modal' }: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: any = null;
	let selectedWall: Wall | null = $state(null);
	let mapLoaded = $state(false);
	let mapError = $state('');

	// Mock statistics - in real app, these would come from API
	function getWallStats(wall: Wall) {
		return {
			usersOnline: Math.floor(Math.random() * 5),
			drawsLast24h: Math.floor(Math.random() * 20),
			wallViews24h: Math.floor(Math.random() * 50) + 10
		};
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function handleClose() {
		selectedWall = null;
		if (onclose) onclose();
		else open = false;
	}

	function handleWallClick(wall: Wall) {
		window.location.href = `/w/${wall.slug}`;
	}

	onMount(async () => {
		if (viewMode === 'modal' && !open) return;
		
		// Wait for the container to be available
		if (!mapContainer) {
			await new Promise(resolve => setTimeout(resolve, 100));
			if (!mapContainer) return;
		}

		console.log('Map component mounting with walls:', walls);

		try {
			// Import the public API key
			const { PUBLIC_GOOGLE_MAPS_API_KEY } = await import('$env/static/public');
			console.log('Google Maps API Key available:', !!PUBLIC_GOOGLE_MAPS_API_KEY);

			// Load Google Maps
			if (!window.google) {
				console.log('Loading Google Maps script...');
				const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`;
				console.log('Script URL:', scriptUrl);
				const script = document.createElement('script');
				script.src = scriptUrl;
				script.async = true;
				document.head.appendChild(script);
				
				await new Promise((resolve, reject) => {
					script.onload = () => {
						console.log('Google Maps script loaded successfully');
						resolve(true);
					};
					script.onerror = (error) => {
						console.error('Failed to load Google Maps script:', error);
						reject(new Error('Google Maps script failed to load. Please check your API key and internet connection.'));
					};
					
					// Add timeout for loading
					setTimeout(() => {
						if (!window.google) {
							console.error('Google Maps script loading timed out');
							reject(new Error('Google Maps loading timed out. Please check your API key.'));
						}
					}, 10000); // 10 second timeout
				});
			} else {
				console.log('Google Maps already loaded');
			}

			// Get user location
			console.log('Getting user location...');
			const userLocation = await new Promise<{lat: number, lng: number}>((resolve) => {
				if (navigator.geolocation) {
					// Add timeout for geolocation
					const timeout = setTimeout(() => {
						console.log('Geolocation timeout, using default location');
						resolve({ lat: 44.8125449, lng: 20.4612278 }); // Belgrade, Serbia
					}, 5000); // 5 second timeout
					
					navigator.geolocation.getCurrentPosition(
						(position) => {
							clearTimeout(timeout);
							console.log('Got user location:', position.coords);
							resolve({
								lat: position.coords.latitude,
								lng: position.coords.longitude
							});
						},
						(error) => {
							clearTimeout(timeout);
							console.log('Geolocation failed, using default location:', error);
							// Default to Belgrade, Serbia
							resolve({ lat: 44.8125449, lng: 20.4612278 });
						},
						{
							timeout: 5000,
							enableHighAccuracy: false
						}
					);
				} else {
					console.log('Geolocation not available, using default location');
					resolve({ lat: 44.8125449, lng: 20.4612278 }); // Belgrade, Serbia
				}
			});

			// Check if Google Maps API is available
			if (!window.google || !window.google.maps) {
				throw new Error('Google Maps API not available');
			}

			// Create map
			console.log('Creating map at location:', userLocation);
			console.log('Map container element:', mapContainer);
			
			const mapOptions = {
				zoom: 8,
				center: userLocation,
				disableDefaultUI: true,
				zoomControl: false,
				mapTypeControl: false,
				scaleControl: false,
				streetViewControl: false,
				rotateControl: false,
				fullscreenControl: false,
				gestureHandling: 'greedy',
				styles: [
					{
						"elementType": "geometry",
						"stylers": [{ "color": "#f5f5f5" }]
					},
					{
						"elementType": "labels.icon",
						"stylers": [{ "visibility": "off" }]
					},
					{
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#616161" }]
					},
					{
						"elementType": "labels.text.stroke",
						"stylers": [{ "color": "#f5f5f5" }]
					},
					{
						"featureType": "administrative.country",
						"elementType": "geometry.stroke",
						"stylers": [{ "color": "#08f70c" }]
					},
					{
						"featureType": "administrative.land_parcel",
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#bdbdbd" }]
					},
					{
						"featureType": "poi",
						"elementType": "geometry",
						"stylers": [{ "color": "#eeeeee" }]
					},
					{
						"featureType": "poi",
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#757575" }]
					},
					{
						"featureType": "poi.park",
						"elementType": "geometry",
						"stylers": [{ "color": "#e5e5e5" }]
					},
					{
						"featureType": "poi.park",
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#9e9e9e" }]
					},
					{
						"featureType": "road",
						"elementType": "geometry",
						"stylers": [{ "color": "#ffffff" }]
					},
					{
						"featureType": "road.arterial",
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#757575" }]
					},
					{
						"featureType": "road.highway",
						"elementType": "geometry",
						"stylers": [{ "color": "#dadada" }]
					},
					{
						"featureType": "road.highway",
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#616161" }]
					},
					{
						"featureType": "road.local",
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#9e9e9e" }]
					},
					{
						"featureType": "transit.line",
						"elementType": "geometry",
						"stylers": [{ "color": "#e5e5e5" }]
					},
					{
						"featureType": "transit.station",
						"elementType": "geometry",
						"stylers": [{ "color": "#eeeeee" }]
					},
					{
						"featureType": "water",
						"elementType": "geometry",
						"stylers": [{ "color": "#c9c9c9" }]
					},
					{
						"featureType": "water",
						"elementType": "labels.text.fill",
						"stylers": [{ "color": "#9e9e9e" }]
					}
				]
			};
			
			console.log('Map options with mapId:', mapOptions);
			map = new window.google.maps.Map(mapContainer, mapOptions);
			console.log('Map created successfully with mapId:', map.getMapId ? map.getMapId() : 'mapId method not available');

			// Add wall markers
			console.log('Adding markers for walls with location data...');
			let markerCount = 0;
			walls.forEach((wall) => {
				if (wall.location_lat && wall.location_lng) {
					console.log('Adding marker for wall:', wall.name, 'at', wall.location_lat, wall.location_lng);
					const marker = new window.google.maps.Marker({
						position: { lat: wall.location_lat, lng: wall.location_lng },
						map: map,
						title: wall.name,
						icon: {
							path: window.google.maps.SymbolPath.CIRCLE,
							scale: 8,
							fillColor: '#3b82f6',
							fillOpacity: 0.8,
							strokeColor: '#1d4ed8',
							strokeWeight: 2
						}
					});

					marker.addListener('click', () => {
						console.log('Marker clicked for wall:', wall.name);
						selectedWall = wall;
					});
					markerCount++;
				}
			});
			console.log(`Added ${markerCount} markers to the map`);

			mapLoaded = true;

		} catch (error) {
			console.error('Error loading map:', error);
			mapError = error?.message || 'Failed to load map';
		}
	});
</script>

{#if viewMode === 'modal' && open}
	<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col">
			<!-- Header -->
			<div class="flex items-center justify-between p-4 border-b">
				<h2 class="text-lg font-semibold">Wall Map</h2>
				<Button
					variant="ghost"
					size="sm"
					onclick={handleClose}
				>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<!-- Map Container -->
			<div class="flex-1 relative">
				<div bind:this={mapContainer} class="w-full h-full"></div>

				<!-- Wall Info Popup -->
				{#if selectedWall}
					{@const stats = getWallStats(selectedWall)}
					<div class="absolute top-4 left-4 bg-white rounded-lg shadow-lg border p-3 max-w-xs">
						<h3 class="font-semibold text-base mb-2">{selectedWall.name}</h3>
						
						<div class="space-y-1.5 text-sm mb-3">
							<div class="flex items-center gap-2">
								<Users class="h-4 w-4 text-gray-500" />
								<span class="text-gray-600">Users online:</span>
								<span class="font-medium ml-auto">{stats.usersOnline}</span>
							</div>
							<div class="flex items-center gap-2">
								<TrendingUp class="h-4 w-4 text-gray-500" />
								<span class="text-gray-600">Drawings (24h):</span>
								<span class="font-medium ml-auto">{stats.drawsLast24h}</span>
							</div>
							<div class="flex items-center gap-2">
								<Eye class="h-4 w-4 text-gray-500" />
								<span class="text-gray-600">Wall views (24h):</span>
								<span class="font-medium ml-auto">{stats.wallViews24h}</span>
							</div>
						</div>

						<Button
							onclick={() => handleWallClick(selectedWall)}
							size="sm"
							class="w-full"
						>
							Open Wall
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{:else if viewMode === 'inline'}
	<!-- Inline Map View -->
	<div class="relative w-full h-full">
		{#if mapError}
			<div class="flex items-center justify-center h-full bg-gray-100">
				<div class="text-center">
					<p class="text-red-600 mb-2">Map Error</p>
					<p class="text-sm text-gray-600">{mapError}</p>
				</div>
			</div>
		{:else if !mapLoaded}
			<div class="flex items-center justify-center h-full bg-gray-100">
				<div class="text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p class="text-gray-600">Loading map...</p>
				</div>
			</div>
		{/if}
		<div bind:this={mapContainer} class="w-full h-full {mapLoaded ? '' : 'opacity-0'}"></div>

		<!-- Wall Info Popup -->
		{#if selectedWall}
			{@const stats = getWallStats(selectedWall)}
			<div class="absolute top-4 left-4 bg-white rounded-lg shadow-lg border p-3 max-w-xs z-10">
				<h3 class="font-semibold text-base mb-2">{selectedWall.name}</h3>
				
				<div class="space-y-1.5 text-sm mb-3">
					<div class="flex items-center gap-2">
						<Users class="h-4 w-4 text-gray-500" />
						<span class="text-gray-600">Users online:</span>
						<span class="font-medium ml-auto">{stats.usersOnline}</span>
					</div>
					<div class="flex items-center gap-2">
						<TrendingUp class="h-4 w-4 text-gray-500" />
						<span class="text-gray-600">Drawings (24h):</span>
						<span class="font-medium ml-auto">{stats.drawsLast24h}</span>
					</div>
					<div class="flex items-center gap-2">
						<Eye class="h-4 w-4 text-gray-500" />
						<span class="text-gray-600">Wall views (24h):</span>
						<span class="font-medium ml-auto">{stats.wallViews24h}</span>
					</div>
				</div>

				<Button
					onclick={() => handleWallClick(selectedWall)}
					size="sm"
					class="w-full"
				>
					Open Wall
				</Button>
			</div>
		{/if}
	</div>
{/if}
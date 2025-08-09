<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronDown, ChevronUp, MapPin } from 'lucide-svelte';
	
	type Props = {
		sessionId: string;
		wallId: string;
		wallSlug: string;
		wallName: string;
		nodeCount: number;
		sessionBounds?: {
			minX: number;
			minY: number;
			maxX: number;
			maxY: number;
		} | null;
		createdAt: string;
		updatedAt: string;
		isActive?: boolean;
		finalizedAt?: string | null;
	};

	let {
		sessionId,
		wallId,
		wallSlug,
		wallName,
		nodeCount,
		sessionBounds,
		createdAt,
		updatedAt,
		isActive,
		finalizedAt
	}: Props = $props();

	let elements = $state<any[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let canvasRef = $state<HTMLCanvasElement | null>(null);
	let showPreview = $state(true);
	let canvasHeight = $state(200);

	// Load elements for this session
	async function loadSessionElements() {
		try {
			const response = await fetch(`/api/canvas/nodes?wall_id=${wallId}&session_id=${sessionId}`);
			if (!response.ok) {
				throw new Error('Failed to load session elements');
			}
			const nodes = await response.json();
			
			// Convert nodes back to Excalidraw-like elements for rendering
			elements = nodes.map((node: any) => ({
				id: node.node_id,
				type: node.content?.elementType || 'rectangle',
				x: node.x,
				y: node.y,
				width: node.width || 100,
				height: node.height || 100,
				strokeColor: node.content?.strokeColor || '#000',
				backgroundColor: node.content?.backgroundColor || 'transparent',
				strokeWidth: node.content?.strokeWidth || 1,
				opacity: node.content?.opacity || 100,
				...node.content
			}));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
			console.error('Error loading session elements:', err);
		} finally {
			loading = false;
		}
	}

	// Simple canvas rendering of elements
	function renderElementsToCanvas() {
		if (!canvasRef || !elements.length) return;
		
		const ctx = canvasRef.getContext('2d');
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

		// Calculate bounds for scaling
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		elements.forEach(el => {
			minX = Math.min(minX, el.x);
			minY = Math.min(minY, el.y);
			maxX = Math.max(maxX, el.x + (el.width || 0));
			maxY = Math.max(maxY, el.y + (el.height || 0));
		});

		// Add padding
		const padding = 20;
		const contentWidth = maxX - minX + padding * 2;
		const contentHeight = maxY - minY + padding * 2;
		
		// Calculate dynamic canvas height based on content aspect ratio
		const aspectRatio = contentHeight / contentWidth;
		const maxHeight = 300;
		const minHeight = 100;
		canvasHeight = Math.min(Math.max(canvasRef.width * aspectRatio, minHeight), maxHeight);
		canvasRef.height = canvasHeight;
		
		// Calculate scale to fit in canvas
		const scaleX = canvasRef.width / contentWidth;
		const scaleY = canvasRef.height / contentHeight;
		const scale = Math.min(scaleX, scaleY, 1); // Don't scale up

		// Center the content
		const offsetX = (canvasRef.width - contentWidth * scale) / 2;
		const offsetY = (canvasRef.height - contentHeight * scale) / 2;

		ctx.save();
		ctx.scale(scale, scale);
		ctx.translate(-minX + padding + offsetX / scale, -minY + padding + offsetY / scale);

		// Render each element
		elements.forEach(element => {
			ctx.save();
			
			// Set styles
			ctx.strokeStyle = element.strokeColor || '#000';
			ctx.fillStyle = element.backgroundColor || 'transparent';
			ctx.lineWidth = element.strokeWidth || 1;
			ctx.globalAlpha = (element.opacity || 100) / 100;

			// Render based on type
			switch (element.type) {
				case 'rectangle':
				case 'diamond':
				case 'ellipse':
					if (element.type === 'rectangle') {
						ctx.beginPath();
						ctx.rect(element.x, element.y, element.width || 100, element.height || 100);
					} else if (element.type === 'ellipse') {
						const centerX = element.x + (element.width || 100) / 2;
						const centerY = element.y + (element.height || 100) / 2;
						const radiusX = (element.width || 100) / 2;
						const radiusY = (element.height || 100) / 2;
						ctx.beginPath();
						ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
					} else if (element.type === 'diamond') {
						const centerX = element.x + (element.width || 100) / 2;
						const centerY = element.y + (element.height || 100) / 2;
						const halfWidth = (element.width || 100) / 2;
						const halfHeight = (element.height || 100) / 2;
						ctx.beginPath();
						ctx.moveTo(centerX, element.y);
						ctx.lineTo(element.x + (element.width || 100), centerY);
						ctx.lineTo(centerX, element.y + (element.height || 100));
						ctx.lineTo(element.x, centerY);
						ctx.closePath();
					}
					
					if (element.backgroundColor && element.backgroundColor !== 'transparent') {
						ctx.fill();
					}
					ctx.stroke();
					break;

				case 'arrow':
				case 'line':
					// Simple line rendering
					ctx.beginPath();
					ctx.moveTo(element.x, element.y);
					ctx.lineTo(element.x + (element.width || 100), element.y + (element.height || 100));
					ctx.stroke();
					break;

				case 'text':
					// Render text
					ctx.font = `${element.fontSize || 16}px ${element.fontFamily || 'Arial'}`;
					ctx.fillStyle = element.strokeColor || '#000';
					const text = element.text || 'Text';
					ctx.fillText(text, element.x, element.y + (element.fontSize || 16));
					break;

				case 'freedraw':
					// Render freehand drawing (simplified)
					if (element.points && element.points.length > 0) {
						ctx.beginPath();
						element.points.forEach((point: any, index: number) => {
							if (index === 0) {
								ctx.moveTo(element.x + point[0], element.y + point[1]);
							} else {
								ctx.lineTo(element.x + point[0], element.y + point[1]);
							}
						});
						ctx.stroke();
					}
					break;

				default:
					// Fallback - render as rectangle
					ctx.beginPath();
					ctx.rect(element.x, element.y, element.width || 50, element.height || 50);
					ctx.stroke();
					break;
			}
			
			ctx.restore();
		});

		ctx.restore();
	}

	onMount(() => {
		loadSessionElements();
	});

	// Re-render when elements change
	$effect(() => {
		if (!loading && elements.length > 0 && showPreview) {
			setTimeout(() => renderElementsToCanvas(), 50);
		}
	});

	function togglePreview() {
		showPreview = !showPreview;
	}

	function locateOnWall() {
		if (!elements.length) return;
		
		// Calculate the center of all elements to focus on
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		elements.forEach(el => {
			minX = Math.min(minX, el.x);
			minY = Math.min(minY, el.y);
			maxX = Math.max(maxX, el.x + (el.width || 0));
			maxY = Math.max(maxY, el.y + (el.height || 0));
		});
		
		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;
		
		// Navigate to wall with center position as URL fragment
		const url = `/w/${wallSlug}#${Math.round(centerX)},${Math.round(centerY)}`;
		window.location.href = url;
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
		
		if (diffInHours < 1) {
			const minutes = Math.floor(diffInHours * 60);
			return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
		}
		
		if (diffInHours < 24) {
			const hours = Math.floor(diffInHours);
			return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		}
		
		if (diffInHours < 24 * 7) {
			const days = Math.floor(diffInHours / 24);
			return `${days} day${days === 1 ? '' : 's'} ago`;
		}
		
		return date.toLocaleDateString();
	}
</script>

<div class="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
	<div class="p-4 sm:p-6">
		<div class="flex items-start justify-between mb-2 sm:mb-3">
			<div class="flex-1">
				<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
					<h3 class="text-base sm:text-lg font-semibold text-gray-900">
						<a href="/w/{wallSlug}" class="hover:text-green-600 transition-colors">
							{wallName}
						</a>
					</h3>
					<div class="flex items-center gap-2">
						<span class="px-2 py-0.5 sm:py-1 text-xs rounded-full {isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
							{isActive !== false ? 'Active' : 'Completed'}
						</span>
						<button
							onclick={togglePreview}
							class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
							title={showPreview ? 'Hide preview' : 'Show preview'}
						>
							{#if showPreview}
								<ChevronUp class="w-4 h-4" />
							{:else}
								<ChevronDown class="w-4 h-4" />
							{/if}
						</button>
					</div>
				</div>
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
					<div class="text-xs sm:text-sm text-gray-500">
						Created {formatDate(createdAt)}
						{#if finalizedAt && finalizedAt !== createdAt}
							<span class="hidden sm:inline">• Finished {formatDate(finalizedAt)}</span>
							<span class="sm:hidden block">Finished {formatDate(finalizedAt)}</span>
						{/if}
					</div>
					{#if elements.length > 0}
						<button
							onclick={locateOnWall}
							class="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors self-start sm:self-auto"
						>
							<MapPin class="w-3 h-3" />
							Locate
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Element Preview -->
		{#if showPreview}
			<div class="mt-4">
				{#if loading}
					<div class="h-24 bg-gray-50 rounded-lg flex items-center justify-center">
						<div class="animate-spin w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full"></div>
					</div>
				{:else if error}
					<div class="h-24 bg-red-50 rounded-lg flex items-center justify-center text-red-600 text-sm">
						Error loading preview: {error}
					</div>
				{:else if elements.length === 0}
					<div class="h-24 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-sm">
						No elements in this session
					</div>
				{:else}
					<div class="relative">
						<canvas 
							bind:this={canvasRef}
							width="400" 
							height={canvasHeight}
							class="w-full bg-gray-50 rounded-lg border"
							style="max-width: 100%; height: {canvasHeight}px;"
						></canvas>
						<div class="absolute top-2 right-2 bg-white/80 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs text-gray-600">
							{elements.length} elements
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
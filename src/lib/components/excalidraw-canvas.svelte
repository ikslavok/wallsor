<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	
	type Props = {
		wallId: string;
		wallName?: string;
		wallSlug?: string;
		wallCreatedAt?: string;
		wallLastOpenedAt?: string;
		onElementsChange?: (elements: any[]) => void;
		class?: string;
	};

	let {
		wallId,
		wallName,
		wallSlug,
		wallCreatedAt,
		wallLastOpenedAt,
		onElementsChange,
		class: className = ''
	}: Props = $props();

	let containerRef: HTMLDivElement;
	let isLoading = $state(true);
	let isSaving = $state(false);
	let lastSavedData: any = null;
	let saveTimeout: NodeJS.Timeout | null = null;
	let reactRoot: any = null;
	
	const SAVE_DELAY = 2000; // Save after 2 seconds of inactivity

	async function initExcalidraw() {
		if (!browser || !containerRef) return;
		
		try {
			// Import Excalidraw styles first
			await import('@excalidraw/excalidraw/index.css');
			
			// Import dependencies
			const React = await import('react');
			const { createRoot } = await import('react-dom/client');
			const ExcalidrawWrapperModule = await import('./ExcalidrawWrapper');
			const ExcalidrawWrapper = ExcalidrawWrapperModule.default;
			
			// Load existing data
			const existingData = await loadCanvasData();
			
			// Create React root
			reactRoot = createRoot(containerRef);
			
			// Handle changes
			const handleChange = (elements: readonly any[], appState: any, files: any) => {
				// Clear existing timeout
				if (saveTimeout) {
					clearTimeout(saveTimeout);
				}
				
				// Set new timeout for auto-save
				saveTimeout = setTimeout(() => {
					saveCanvasData([...elements], appState);
				}, SAVE_DELAY);
				
				// Notify parent component if needed
				if (onElementsChange) {
					onElementsChange([...elements]);
				}
			};
			
			// Render Excalidraw
			reactRoot.render(
				React.createElement(ExcalidrawWrapper, {
					wallId,
					wallName,
					wallSlug,
					wallCreatedAt,
					wallLastOpenedAt,
					initialData: {
						elements: existingData?.elements || [],
						appState: existingData?.appState || {
							viewBackgroundColor: "#ffffff",
							gridSize: 20,
							theme: "light"
						}
					},
					onChange: handleChange
				})
			);
			
			isLoading = false;
		} catch (error) {
			console.error('Failed to load Excalidraw:', error);
			isLoading = false;
		}
	}

	async function loadCanvasData() {
		try {
			const response = await fetch(`/api/canvas/excalidraw?wall_id=${wallId}`);
			if (response.ok) {
				const data = await response.json();
				lastSavedData = data;
				return data;
			}
		} catch (error) {
			console.error('Failed to load canvas data:', error);
		}
		return null;
	}

	async function saveCanvasData(elements: any, appState: any) {
		if (isSaving) return;
		
		// Only save if there are changes
		const currentData = { elements, appState };
		if (JSON.stringify(currentData) === JSON.stringify(lastSavedData)) {
			return;
		}
		
		isSaving = true;
		
		try {
			const response = await fetch('/api/canvas/excalidraw', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					wall_id: wallId,
					elements,
					appState: appState ? {
						viewBackgroundColor: appState.viewBackgroundColor,
						currentItemStrokeColor: appState.currentItemStrokeColor,
						currentItemBackgroundColor: appState.currentItemBackgroundColor,
						currentItemFillStyle: appState.currentItemFillStyle,
						currentItemStrokeWidth: appState.currentItemStrokeWidth,
						currentItemFontFamily: appState.currentItemFontFamily,
						currentItemFontSize: appState.currentItemFontSize,
						zoom: appState.zoom,
						scrollX: appState.scrollX,
						scrollY: appState.scrollY
					} : {}
				})
			});
			
			if (response.ok) {
				lastSavedData = currentData;
				console.log('Canvas saved successfully');
			}
		} catch (error) {
			console.error('Failed to save canvas:', error);
		} finally {
			isSaving = false;
		}
	}

	onMount(() => {
		initExcalidraw();
	});

	onDestroy(() => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		if (reactRoot) {
			reactRoot.unmount();
		}
	});
</script>

<div class="excalidraw-wrapper {className}">
	{#if isLoading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading canvas...</p>
		</div>
	{/if}
	
	<div bind:this={containerRef} class="excalidraw-container"></div>
	
	{#if isSaving}
		<div class="save-indicator">Saving...</div>
	{/if}
</div>

<style>
	.excalidraw-wrapper {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
	}

	.excalidraw-container {
		width: 100%;
		height: 100%;
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		background: #f8f9fa;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e9ecef;
		border-top: 4px solid #495057;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.save-indicator {
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 12px;
		z-index: 999999;
		animation: fadeIn 0.3s ease-in-out;
		pointer-events: none;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
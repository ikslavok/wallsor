<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Pen, Type, Image as ImageIcon } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';

	type Props = {
		wallId: string;
		onElementsChange?: (elements: any[]) => void;
		class?: string;
	};

	let {
		wallId,
		onElementsChange,
		class: className = ''
	}: Props = $props();

	let canvasElement: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let isDrawing = $state(false);
	let currentPath: any[] = $state([]);
	let allPaths: any[] = $state([]);
	let allNodes: any[] = $state([]);
	let sessionTimeout: NodeJS.Timeout | null = null;
	let activeTool = $state<'draw' | 'text' | 'image'>('draw');
	let isAddingText = $state(false);
	let textInput = $state('');
	let textPosition = $state({ x: 0, y: 0 });
	let fileInput: HTMLInputElement;

	const SESSION_PAUSE_DURATION = 60000;

	function focusOnMount(element: HTMLInputElement) {
		element.focus();
		return {
			destroy() {}
		};
	}

	function getEventPosition(event: MouseEvent | TouchEvent): { x: number, y: number } {
		const rect = canvasElement.getBoundingClientRect();
		if ('touches' in event) {
			// Touch event
			const touch = event.touches[0];
			return {
				x: touch.clientX - rect.left,
				y: touch.clientY - rect.top
			};
		} else {
			// Mouse event
			return {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		}
	}

	function handleCanvasClick(event: MouseEvent | TouchEvent) {
		event.preventDefault();
		const { x, y } = getEventPosition(event);
		
		if (activeTool === 'draw') {
			startDrawing(event);
		} else if (activeTool === 'text') {
			startTextInput(x, y);
		} else if (activeTool === 'image') {
			fileInput.click();
			textPosition = { x, y };
		}
	}

	function startDrawing(event: MouseEvent | TouchEvent) {
		if (activeTool !== 'draw') return;
		event.preventDefault();
		isDrawing = true;
		const { x, y } = getEventPosition(event);
		
		currentPath = [{ x, y, type: 'start' }];
		ctx.beginPath();
		ctx.moveTo(x, y);
	}

	function startTextInput(x: number, y: number) {
		isAddingText = true;
		textPosition = { x, y };
		textInput = '';
	}

	async function confirmText() {
		if (textInput.trim() && isAddingText) {
			try {
				// Create a session first
				const sessionResponse = await fetch('/api/canvas/sessions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ wall_id: wallId })
				});
				
				if (sessionResponse.ok) {
					const session = await sessionResponse.json();
					const sessionId = session.session_id;
					
					// Save text as a node
					const nodeResponse = await fetch('/api/canvas/nodes', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							session_id: sessionId,
							wall_id: wallId,
							node_type: 'text',
							x: textPosition.x,
							y: textPosition.y,
							width: textInput.length * 10, // Rough width estimate
							height: 20,
							content: {
								text: textInput,
								fontSize: 16,
								color: '#000000'
							}
						})
					});
					
					if (nodeResponse.ok) {
						const node = await nodeResponse.json();
						allNodes.push(node);
						redrawCanvas();
					}
				}
			} catch (error) {
				console.error('Failed to save text:', error);
			}
			
			isAddingText = false;
			textInput = '';
		}
	}

	function cancelText() {
		isAddingText = false;
		textInput = '';
	}

	async function handleImageUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (file && file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const imageData = e.target?.result as string;
				
				try {
					// Create a session first
					const sessionResponse = await fetch('/api/canvas/sessions', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ wall_id: wallId })
					});
					
					if (sessionResponse.ok) {
						const session = await sessionResponse.json();
						const sessionId = session.session_id;
						
						// Save image as a node
						const nodeResponse = await fetch('/api/canvas/nodes', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								session_id: sessionId,
								wall_id: wallId,
								node_type: 'file',
								x: textPosition.x,
								y: textPosition.y,
								width: 200, // Default width
								height: 200, // Default height
								content: {
									type: 'image',
									data: imageData,
									fileName: file.name
								}
							})
						});
						
						if (nodeResponse.ok) {
							const node = await nodeResponse.json();
							allNodes.push(node);
							redrawCanvas();
						}
					}
				} catch (error) {
					console.error('Failed to save image:', error);
				}
			};
			reader.readAsDataURL(file);
		}
		
		// Clear the input
		input.value = '';
	}

	function draw(event: MouseEvent | TouchEvent) {
		if (!isDrawing || activeTool !== 'draw') return;
		event.preventDefault();
		
		const { x, y } = getEventPosition(event);
		
		currentPath.push({ x, y, type: 'draw' });
		ctx.lineTo(x, y);
		ctx.stroke();
		
		// Reset session timeout on each drawing action
		if (sessionTimeout) {
			clearTimeout(sessionTimeout);
		}
		sessionTimeout = setTimeout(saveSession, SESSION_PAUSE_DURATION);
	}

	function stopDrawing() {
		if (!isDrawing || activeTool !== 'draw') return;
		
		isDrawing = false;
		if (currentPath.length > 0) {
			const pathElement = {
				id: crypto.randomUUID(),
				type: 'freedraw',
				points: currentPath,
				strokeColor: '#000000',
				strokeWidth: 2,
				x: Math.min(...currentPath.map(p => p.x)),
				y: Math.min(...currentPath.map(p => p.y)),
				width: Math.max(...currentPath.map(p => p.x)) - Math.min(...currentPath.map(p => p.x)),
				height: Math.max(...currentPath.map(p => p.y)) - Math.min(...currentPath.map(p => p.y))
			};
			
			allPaths.push(pathElement);
			
			if (onElementsChange) {
				onElementsChange(allPaths);
			}
		}
		currentPath = [];
	}

	async function loadNodes() {
		try {
			const response = await fetch(`/api/canvas/nodes?wall_id=${wallId}`);
			if (response.ok) {
				const nodes = await response.json();
				allNodes = nodes;
				redrawCanvas();
			}
		} catch (error) {
			console.error('Failed to load canvas data:', error);
		}
	}

	function redrawCanvas() {
		if (!ctx) return;
		
		// Clear canvas
		ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
		
		// Redraw all nodes
		for (const node of allNodes) {
			if (node.node_type === 'draw' && node.content?.points) {
				drawPath(node.content.points, node.content.strokeColor || '#000000', node.content.strokeWidth || 2);
			} else if (node.node_type === 'text' && node.content?.text) {
				drawText(node.content.text, node.x, node.y, node.content.fontSize || 16, node.content.color || '#000000');
			} else if (node.node_type === 'file' && node.content?.type === 'image' && node.content?.data) {
				drawImage(node.content.data, node.x, node.y, node.width || 200, node.height || 200);
			}
		}
	}

	function drawImage(imageData: string, x: number, y: number, width: number, height: number) {
		const img = new Image();
		img.onload = () => {
			ctx.drawImage(img, x, y, width, height);
		};
		img.src = imageData;
	}

	function drawPath(points: any[], strokeColor: string, strokeWidth: number) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = strokeWidth;
		ctx.beginPath();
		
		if (points.length > 0) {
			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(points[i].x, points[i].y);
			}
			ctx.stroke();
		}
	}

	function drawText(text: string, x: number, y: number, fontSize: number, color: string) {
		ctx.fillStyle = color;
		ctx.font = `${fontSize}px Arial`;
		ctx.fillText(text, x, y);
	}

	async function saveSession() {
		if (allPaths.length > 0) {
			try {
				// Create a session first
				const sessionResponse = await fetch('/api/canvas/sessions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ wall_id: wallId })
				});
				
				if (sessionResponse.ok) {
					const session = await sessionResponse.json();
					const sessionId = session.session_id;
					
					// Save each drawing path as a node
					for (const path of allPaths) {
						const nodeResponse = await fetch('/api/canvas/nodes', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								session_id: sessionId,
								wall_id: wallId,
								node_type: 'draw',
								x: path.x,
								y: path.y,
								width: path.width,
								height: path.height,
								content: {
									type: 'drawing',
									points: path.points,
									strokeColor: path.strokeColor,
									strokeWidth: path.strokeWidth
								}
							})
						});
						
						if (nodeResponse.ok) {
							const node = await nodeResponse.json();
							allNodes.push(node);
						}
					}
					
					// Clear the temporary paths since they're now saved as nodes
					allPaths = [];
					
					console.log(`Saved drawing session ${sessionId} for wall ${wallId}`);
				}
			} catch (error) {
				console.error('Failed to save drawing session:', error);
			}
		}
		sessionTimeout = null;
	}

	onMount(() => {
		ctx = canvasElement.getContext('2d')!;
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// Set canvas size to full viewport
		canvasElement.width = window.innerWidth;
		canvasElement.height = window.innerHeight;

		// Load existing canvas data
		loadNodes();

		// Handle resize
		const handleResize = () => {
			canvasElement.width = window.innerWidth;
			canvasElement.height = window.innerHeight;
			ctx.strokeStyle = '#000000';
			ctx.lineWidth = 2;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			redrawCanvas();
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		if (sessionTimeout) {
			clearTimeout(sessionTimeout);
			saveSession();
		}
	});
</script>

<!-- Toolbar -->
<div class="canvas-toolbar" style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 20; display: flex; gap: 8px; background: white; padding: 8px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
	<Button
		variant={activeTool === 'draw' ? 'default' : 'outline'}
		size="sm"
		onclick={() => activeTool = 'draw'}
		class="w-10 h-10 p-2"
	>
		{#snippet children()}<Pen size={16} />{/snippet}
	</Button>
	<Button
		variant={activeTool === 'text' ? 'default' : 'outline'}
		size="sm"
		onclick={() => activeTool = 'text'}
		class="w-10 h-10 p-2"
	>
		{#snippet children()}<Type size={16} />{/snippet}
	</Button>
	<Button
		variant={activeTool === 'image' ? 'default' : 'outline'}
		size="sm"
		onclick={() => activeTool = 'image'}
		class="w-10 h-10 p-2"
	>
		{#snippet children()}<ImageIcon size={16} />{/snippet}
	</Button>
</div>

<!-- Canvas -->
<canvas
	bind:this={canvasElement}
	class="simple-canvas {className}"
	style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: white; cursor: {activeTool === 'draw' ? 'crosshair' : activeTool === 'text' ? 'text' : 'pointer'}; z-index: 10;"
	onmousedown={handleCanvasClick}
	onmousemove={draw}
	onmouseup={stopDrawing}
	onmouseleave={stopDrawing}
	ontouchstart={handleCanvasClick}
	ontouchmove={draw}
	ontouchend={stopDrawing}
></canvas>

<!-- Text Input Modal -->
{#if isAddingText}
	<div class="text-input-modal" style="position: fixed; top: {textPosition.y}px; left: {textPosition.x}px; z-index: 30; background: white; padding: 8px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
		<input
			type="text"
			bind:value={textInput}
			placeholder="Enter text..."
			class="text-input"
			style="border: 1px solid #ccc; padding: 4px 8px; border-radius: 4px; outline: none; font-size: 16px; width: 200px;"
			onkeydown={(e) => {
				if (e.key === 'Enter') confirmText();
				if (e.key === 'Escape') cancelText();
			}}
			use:focusOnMount
		/>
		<div class="text-input-buttons" style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
			<Button size="sm" variant="outline" onclick={cancelText}>
				{#snippet children()}Cancel{/snippet}
			</Button>
			<Button size="sm" onclick={confirmText}>
				{#snippet children()}Add{/snippet}
			</Button>
		</div>
	</div>
{/if}

<!-- Hidden File Input -->
<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	onchange={handleImageUpload}
	style="display: none;"
/>

<style>
	.simple-canvas {
		touch-action: none;
	}
</style>
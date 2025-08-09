<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	
	type Props = {
		open: boolean;
		onConfirm: () => void;
		onCancel: () => void;
		title?: string;
		description?: string;
		confirmText?: string;
		cancelText?: string;
		destructive?: boolean;
	};
	
	let { 
		open = $bindable(false),
		onConfirm,
		onCancel,
		title = 'Are you sure?',
		description = 'This action cannot be undone.',
		confirmText = 'Continue',
		cancelText = 'Cancel',
		destructive = false
	}: Props = $props();
	
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onCancel();
		}
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

{#if open}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="alert-dialog-title"
		aria-describedby="alert-dialog-description"
		transition:fade={{ duration: 150 }}
	>
		<!-- Backdrop -->
		<div class="fixed inset-0 bg-black/50" aria-hidden="true"></div>
		
		<!-- Dialog -->
		<div 
			class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<div class="mb-4">
				<h2 id="alert-dialog-title" class="text-lg font-semibold text-gray-900 mb-2">
					{title}
				</h2>
				<p id="alert-dialog-description" class="text-sm text-gray-600">
					{description}
				</p>
			</div>
			
			<div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
				<button
					onclick={onCancel}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
				>
					{cancelText}
				</button>
				<button
					onclick={onConfirm}
					class="px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors {destructive 
						? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
						: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
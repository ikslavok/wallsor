<script lang="ts">
	import { cn } from '$lib/utils';
	import { X } from 'lucide-svelte';
	import Button from './button.svelte';

	type Props = {
		open?: boolean;
		onclose?: () => void;
		title?: string;
		description?: string;
		class?: string;
		children?: any;
	};

	let {
		open = $bindable(false),
		onclose,
		title,
		description,
		class: className,
		children
	}: Props = $props();

	function handleBackdropClick() {
		if (onclose) onclose();
		else open = false;
	}

	function handleDialogClick(e: MouseEvent) {
		e.stopPropagation();
	}

	function handleClose() {
		if (onclose) onclose();
		else open = false;
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50"
		onclick={handleBackdropClick}
		role="button"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
	>
		<!-- Dialog -->
		<div class="flex min-h-full items-center justify-center p-4">
			<div
				class={cn(
					'relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg',
					className
				)}
				onclick={handleDialogClick}
				onkeydown={(e) => e.key === 'Enter' && e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				tabindex="-1"
			>
				<!-- Close button -->
				<Button
					onclick={handleClose}
					variant="ghost"
					size="icon"
					class="absolute right-2 top-2 h-8 w-8"
				>
					<X class="h-4 w-4" />
				</Button>

				{#if title}
					<div class="mb-4">
						<h2 class="text-lg font-semibold">{title}</h2>
						{#if description}
							<p class="mt-1 text-sm text-gray-500">{description}</p>
						{/if}
					</div>
				{/if}

				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
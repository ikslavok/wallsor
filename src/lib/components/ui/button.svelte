<script lang="ts">
	import { cn } from '$lib/utils';
	import { tv, type VariantProps } from 'tailwind-variants';

	const buttonVariants = tv({
		base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
		variants: {
			variant: {
				default: 'bg-gray-900 text-gray-50 hover:bg-gray-900/90',
				outline: 'border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900',
				secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-100/80',
				ghost: 'hover:bg-gray-100 hover:text-gray-900',
				link: 'text-gray-900 underline-offset-4 hover:underline'
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	type Props = {
		variant?: VariantProps<typeof buttonVariants>['variant'];
		size?: VariantProps<typeof buttonVariants>['size'];
		class?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		onclick?: (event: MouseEvent) => void;
		children?: any;
	};

	let {
		variant = 'default',
		size = 'default',
		class: className,
		type = 'button',
		disabled = false,
		onclick,
		children,
		...restProps
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	{onclick}
	class={cn(buttonVariants({ variant, size }), className)}
	{...restProps}
>
	{@render children?.()}
</button>
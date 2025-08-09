<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		type?: string;
		value?: string | number;
		placeholder?: string;
		class?: string;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		name?: string;
		id?: string;
		oninput?: (event: Event) => void;
		onchange?: (event: Event) => void;
		onfocus?: (event: FocusEvent) => void;
		onblur?: (event: FocusEvent) => void;
	};

	let {
		type = 'text',
		value = $bindable(),
		placeholder,
		class: className,
		disabled = false,
		readonly = false,
		required = false,
		name,
		id,
		oninput,
		onchange,
		onfocus,
		onblur,
		...restProps
	}: Props = $props();
</script>

<input
	{type}
	bind:value
	{placeholder}
	{disabled}
	{readonly}
	{required}
	{name}
	{id}
	{oninput}
	{onchange}
	{onfocus}
	{onblur}
	class={cn(
		'flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
/>
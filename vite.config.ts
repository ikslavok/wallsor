import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		include: ['react', 'react-dom', '@excalidraw/excalidraw'],
		exclude: []
	},
	resolve: {
		dedupe: ['react', 'react-dom']
	},
	esbuild: {
		jsx: 'automatic'
	},
	ssr: {
		noExternal: ['@excalidraw/excalidraw']
	}
});

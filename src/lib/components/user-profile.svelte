<script lang="ts">
	import { onMount } from 'svelte';
	import { Trash2, User, Activity, Folder, RotateCcw } from 'lucide-svelte';
	import Button from './ui/button.svelte';
	import { 
		getUserSessions, 
		getUserWalls, 
		deleteUserSession, 
		deleteUserWall, 
		resetAnonId,
		formatDate,
		getSessionThumbnailInfo,
		type UserSession,
		type UserWall 
	} from '$lib/api/profile';

	type Props = {
		open: boolean;
	};

	let { open = $bindable() }: Props = $props();

	let activeTab = $state<'activity' | 'walls'>('activity');
	let sessions = $state<UserSession[]>([]);
	let walls = $state<UserWall[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sessionsPage = $state(1);
	let wallsPage = $state(1);
	let hasMoreSessions = $state(true);
	let hasMoreWalls = $state(true);

	let modalElement: HTMLDivElement;

	async function loadSessions(page = 1, append = false) {
		if (loading) return;
		
		loading = true;
		error = null;
		
		try {
			const response = await getUserSessions(page);
			
			if (append) {
				sessions = [...sessions, ...response.sessions];
			} else {
				sessions = response.sessions;
			}
			
			sessionsPage = page;
			hasMoreSessions = response.pagination.hasMore;
		} catch (err) {
			error = 'Failed to load activity sessions';
			console.error('Error loading sessions:', err);
		} finally {
			loading = false;
		}
	}

	async function loadWalls(page = 1, append = false) {
		if (loading) return;
		
		loading = true;
		error = null;
		
		try {
			const response = await getUserWalls(page);
			
			if (append) {
				walls = [...walls, ...response.walls];
			} else {
				walls = response.walls;
			}
			
			wallsPage = page;
			hasMoreWalls = response.pagination.hasMore;
		} catch (err) {
			error = 'Failed to load walls';
			console.error('Error loading walls:', err);
		} finally {
			loading = false;
		}
	}

	async function handleDeleteSession(sessionId: string) {
		if (!confirm('Are you sure you want to delete this drawing session? This action cannot be undone.')) {
			return;
		}
		
		try {
			await deleteUserSession(sessionId);
			sessions = sessions.filter(s => s.session_id !== sessionId);
		} catch (err) {
			error = 'Failed to delete session';
			console.error('Error deleting session:', err);
		}
	}

	async function handleDeleteWall(wallId: string) {
		if (!confirm('Are you sure you want to delete this wall? This will also delete all associated drawing sessions and cannot be undone.')) {
			return;
		}
		
		try {
			await deleteUserWall(wallId);
			walls = walls.filter(w => w.wall_id !== wallId);
		} catch (err) {
			error = 'Failed to delete wall';
			console.error('Error deleting wall:', err);
		}
	}

	async function handleResetId() {
		if (!confirm('Are you sure you want to reset your anonymous ID? This will disconnect you from all your previous activity and walls. This action cannot be undone.')) {
			return;
		}
		
		try {
			await resetAnonId();
			// Clear local data
			sessions = [];
			walls = [];
			// Close modal and refresh page to get new ID
			open = false;
			window.location.reload();
		} catch (err) {
			error = 'Failed to reset anonymous ID';
			console.error('Error resetting ID:', err);
		}
	}

	function handleTabChange(tab: 'activity' | 'walls') {
		activeTab = tab;
		error = null;
		
		if (tab === 'activity' && sessions.length === 0) {
			loadSessions();
		} else if (tab === 'walls' && walls.length === 0) {
			loadWalls();
		}
	}

	function handleLoadMore() {
		if (activeTab === 'activity' && hasMoreSessions) {
			loadSessions(sessionsPage + 1, true);
		} else if (activeTab === 'walls' && hasMoreWalls) {
			loadWalls(wallsPage + 1, true);
		}
	}

	function handleModalClick(event: MouseEvent) {
		if (event.target === modalElement) {
			open = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
		}
	}

	// Load initial data when modal opens
	$effect(() => {
		if (open && activeTab === 'activity' && sessions.length === 0) {
			loadSessions();
		} else if (open && activeTab === 'walls' && walls.length === 0) {
			loadWalls();
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div 
		class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
		bind:this={modalElement}
		onclick={handleModalClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="profile-title"
	>
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
						<User class="w-5 h-5 text-blue-600" />
					</div>
					<div>
						<h2 id="profile-title" class="text-xl font-semibold text-gray-900">Your Profile</h2>
						<p class="text-sm text-gray-500">Manage your walls and drawing activity</p>
					</div>
				</div>
				<div class="flex gap-2">
					<Button
						onclick={handleResetId}
						variant="outline"
						size="sm"
						class="text-red-600 hover:text-red-700 hover:bg-red-50"
					>
						<RotateCcw class="w-4 h-4 mr-2" />
						Reset ID
					</Button>
					<button
						onclick={() => open = false}
						class="text-gray-400 hover:text-gray-600 p-2"
						aria-label="Close profile"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Tabs -->
			<div class="flex border-b">
				<button
					onclick={() => handleTabChange('activity')}
					class="flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'activity' 
						? 'text-blue-600 border-blue-600' 
						: 'text-gray-500 border-transparent hover:text-gray-700'}"
				>
					<Activity class="w-4 h-4 inline mr-2" />
					Activity
				</button>
				<button
					onclick={() => handleTabChange('walls')}
					class="flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors {activeTab === 'walls' 
						? 'text-blue-600 border-blue-600' 
						: 'text-gray-500 border-transparent hover:text-gray-700'}"
				>
					<Folder class="w-4 h-4 inline mr-2" />
					Walls
				</button>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto max-h-96">
				{#if error}
					<div class="p-6 text-center">
						<div class="text-red-600 mb-2">{error}</div>
						<Button onclick={() => activeTab === 'activity' ? loadSessions() : loadWalls()} variant="outline" size="sm">
							Try Again
						</Button>
					</div>
				{:else if loading && (sessions.length === 0 || walls.length === 0)}
					<div class="p-6 text-center">
						<div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
						<p class="text-gray-500">Loading...</p>
					</div>
				{:else}
					<!-- Activity Tab -->
					{#if activeTab === 'activity'}
						{#if sessions.length === 0}
							<div class="p-6 text-center">
								<Activity class="w-12 h-12 text-gray-300 mx-auto mb-3" />
								<p class="text-gray-500">No drawing sessions yet</p>
								<p class="text-sm text-gray-400 mt-1">Start drawing on a wall to see your activity here</p>
							</div>
						{:else}
							<div class="p-6">
								{#each sessions as session (session.session_id)}
									<div class="flex items-center justify-between p-4 border rounded-lg mb-3 hover:bg-gray-50">
										<div class="flex-1">
											<div class="flex items-center gap-3 mb-2">
												<h3 class="font-medium text-gray-900">
													<a href="/w/{session.wall_slug}" class="hover:text-blue-600">
														{session.wall_name}
													</a>
												</h3>
												<span class="text-xs px-2 py-1 rounded-full {session.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
													{session.is_active ? 'Active' : 'Completed'}
												</span>
											</div>
											<div class="text-sm text-gray-600 mb-1">
												{session.node_count} element{session.node_count === 1 ? '' : 's'}
												{#if session.session_bounds}
													• {Math.round(getSessionThumbnailInfo(session).width)} × {Math.round(getSessionThumbnailInfo(session).height)}px
												{/if}
											</div>
											<div class="text-xs text-gray-500">
												{formatDate(session.created_at)}
												{#if session.finalized_at && session.finalized_at !== session.created_at}
													- {formatDate(session.finalized_at)}
												{/if}
											</div>
										</div>
										<Button
											onclick={() => handleDeleteSession(session.session_id)}
											variant="ghost"
											size="sm"
											class="text-red-600 hover:text-red-700 hover:bg-red-50"
										>
											<Trash2 class="w-4 h-4" />
										</Button>
									</div>
								{/each}
								
								{#if hasMoreSessions}
									<div class="text-center pt-4">
										<Button onclick={handleLoadMore} variant="outline" disabled={loading}>
											{loading ? 'Loading...' : 'Load More'}
										</Button>
									</div>
								{/if}
							</div>
						{/if}
					
					<!-- Walls Tab -->
					{:else if activeTab === 'walls'}
						{#if walls.length === 0}
							<div class="p-6 text-center">
								<Folder class="w-12 h-12 text-gray-300 mx-auto mb-3" />
								<p class="text-gray-500">No walls created yet</p>
								<p class="text-sm text-gray-400 mt-1">Create your first wall to get started</p>
							</div>
						{:else}
							<div class="p-6">
								{#each walls as wall (wall.wall_id)}
									<div class="flex items-center justify-between p-4 border rounded-lg mb-3 hover:bg-gray-50">
										<div class="flex-1">
											<div class="flex items-center gap-3 mb-2">
												<h3 class="font-medium text-gray-900">
													<a href="/w/{wall.slug}" class="hover:text-blue-600">
														{wall.name}
													</a>
												</h3>
												{#if wall.location}
													<span class="text-xs text-gray-500">{wall.location}</span>
												{/if}
											</div>
											<div class="text-sm text-gray-600 mb-1">
												{wall.stats.total_sessions} session{wall.stats.total_sessions === 1 ? '' : 's'}
												• {wall.stats.total_elements} element{wall.stats.total_elements === 1 ? '' : 's'}
												{#if wall.stats.active_sessions > 0}
													• {wall.stats.active_sessions} active
												{/if}
											</div>
											<div class="text-xs text-gray-500">
												Created {formatDate(wall.created_at)}
												{#if wall.last_activity !== wall.created_at}
													• Last activity {formatDate(wall.last_activity)}
												{/if}
											</div>
										</div>
										<Button
											onclick={() => handleDeleteWall(wall.wall_id)}
											variant="ghost"
											size="sm"
											class="text-red-600 hover:text-red-700 hover:bg-red-50"
										>
											<Trash2 class="w-4 h-4" />
										</Button>
									</div>
								{/each}
								
								{#if hasMoreWalls}
									<div class="text-center pt-4">
										<Button onclick={handleLoadMore} variant="outline" disabled={loading}>
											{loading ? 'Loading...' : 'Load More'}
										</Button>
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
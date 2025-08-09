<script lang="ts">
	import { onMount } from 'svelte';
	import { Trash2, User, Activity, Folder, RotateCcw, ArrowLeft, Home, Copy, Check } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';
	import SessionPreview from '$lib/components/session-preview.svelte';
	import AlertDialog from '$lib/components/ui/alert-dialog.svelte';
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

	let { data } = $props();
	
	let activeTab = $state<'activity' | 'walls'>('activity');
	let sessions = $state<UserSession[]>([]);
	let walls = $state<UserWall[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sessionsPage = $state(1);
	let wallsPage = $state(1);
	let hasMoreSessions = $state(true);
	let hasMoreWalls = $state(true);
	let selectedWallFilter = $state<string>('all');
	let availableWalls = $state<{id: string; name: string}[]>([]);
	let showResetDialog = $state(false);
	let showCopied = $state(false);

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
				// Extract available walls for filter
				const wallSet = new Set<string>();
				const wallMap = new Map<string, string>();
				response.sessions.forEach(session => {
					if (!wallSet.has(session.wall_id)) {
						wallSet.add(session.wall_id);
						wallMap.set(session.wall_id, session.wall_name);
					}
				});
				availableWalls = Array.from(wallSet).map(id => ({
					id,
					name: wallMap.get(id) || 'Unknown'
				}));
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
		try {
			await resetAnonId();
			// Redirect to home page after reset
			window.location.href = '/';
		} catch (err) {
			error = 'Failed to reset anonymous ID';
			console.error('Error resetting ID:', err);
		}
		showResetDialog = false;
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

	function copyUserId() {
		navigator.clipboard.writeText(data.anonId);
		showCopied = true;
		setTimeout(() => {
			showCopied = false;
		}, 2000);
	}

	// Filter sessions based on selected wall
	let filteredSessions = $derived(() => {
		if (selectedWallFilter === 'all') {
			return sessions;
		}
		return sessions.filter(session => session.wall_id === selectedWallFilter);
	});

	function handleWallFilterChange(wallId: string) {
		selectedWallFilter = wallId;
	}

	// Load initial data
	onMount(() => {
		if (activeTab === 'activity') {
			loadSessions();
		} else {
			loadWalls();
		}
	});
</script>

<svelte:head>
	<title>Your Profile - Wallsor</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white shadow-sm border-b">
		<div class="container mx-auto px-4 py-4 sm:py-6">
			<!-- Mobile Layout -->
			<div class="sm:hidden">
				<div class="flex items-center justify-between mb-3">
					<Button
						onclick={() => window.location.href = '/'}
						variant="ghost"
						size="sm"
						class="text-gray-600 hover:text-gray-900 -ml-2"
					>
						<ArrowLeft class="w-4 h-4 mr-1" />
						Back
					</Button>
				</div>
				<div class="flex items-center gap-3 mb-3">
					<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
						<User class="w-5 h-5 text-green-600" />
					</div>
					<div class="flex-1">
						<h1 class="text-xl font-bold text-gray-900">Your Profile</h1>
						<p class="text-sm text-gray-600">Manage your activity</p>
					</div>
				</div>
				<div class="bg-gray-50 rounded-lg px-3 py-2 relative">
					<div class="flex items-center justify-between mb-1">
						<p class="text-xs text-gray-500">Anonymous ID</p>
						<button
							onclick={() => showResetDialog = true}
							class="text-red-500 hover:text-red-700 transition-colors p-1 -m-1"
							title="Reset ID"
						>
							<RotateCcw class="w-3 h-3" />
						</button>
					</div>
					<div class="flex items-center gap-1">
						<code class="text-xs font-mono text-gray-700">
							{data.anonId.length > 12 ? `${data.anonId.slice(0, 8)}...${data.anonId.slice(-4)}` : data.anonId}
						</code>
						<button
							onclick={copyUserId}
							class="transition-colors p-1 {showCopied ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}"
							title={showCopied ? 'Copied!' : 'Copy ID'}
						>
							{#if showCopied}
								<Check class="w-3 h-3" />
							{:else}
								<Copy class="w-3 h-3" />
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Desktop Layout -->
			<div class="hidden sm:flex items-center justify-between">
				<div class="flex items-center gap-4">
					<Button
						onclick={() => window.location.href = '/'}
						variant="ghost"
						size="sm"
						class="text-gray-600 hover:text-gray-900"
					>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Back to Home
					</Button>
					<div class="h-6 border-l border-gray-300"></div>
					<div class="flex items-center gap-3">
						<div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
							<User class="w-6 h-6 text-green-600" />
						</div>
						<div>
							<h1 class="text-2xl font-bold text-gray-900">Your Profile</h1>
							<p class="text-gray-600">Manage your walls and drawing activity</p>
						</div>
					</div>
				</div>
				
				<div class="text-right">
					<div class="bg-gray-100 rounded px-3 py-1 relative">
						<div class="flex items-center justify-between mb-1">
							<p class="text-xs text-gray-500">Anonymous ID</p>
							<button
								onclick={() => showResetDialog = true}
								class="text-red-500 hover:text-red-700 transition-colors p-1 -m-1"
								title="Reset ID"
							>
								<RotateCcw class="w-3 h-3" />
							</button>
						</div>
						<div class="flex items-center gap-1">
							<code class="text-xs font-mono text-gray-700">
								{data.anonId.length > 12 ? `${data.anonId.slice(0, 8)}...${data.anonId.slice(-4)}` : data.anonId}
							</code>
							<button
								onclick={copyUserId}
								class="transition-colors p-1 {showCopied ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}"
								title={showCopied ? 'Copied!' : 'Copy ID'}
							>
								{#if showCopied}
									<Check class="w-3 h-3" />
								{:else}
									<Copy class="w-3 h-3" />
								{/if}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Navigation Tabs -->
	<div class="bg-white border-b">
		<div class="container mx-auto px-4">
			<div class="flex">
				<button
					onclick={() => handleTabChange('activity')}
					class="flex-1 sm:flex-none px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors {activeTab === 'activity' 
						? 'text-green-600 border-green-600' 
						: 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}"
				>
					<Activity class="w-4 h-4 inline mr-1 sm:mr-2" />
					<span class="hidden sm:inline">Drawing Activity</span>
					<span class="sm:hidden">Activity</span>
				</button>
				<button
					onclick={() => handleTabChange('walls')}
					class="flex-1 sm:flex-none px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors {activeTab === 'walls' 
						? 'text-green-600 border-green-600' 
						: 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}"
				>
					<Folder class="w-4 h-4 inline mr-1 sm:mr-2" />
					<span class="hidden sm:inline">My Walls</span>
					<span class="sm:hidden">Walls</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="container mx-auto px-4 py-4 sm:py-8">
		{#if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
				<div class="flex items-center gap-3">
					<div class="text-red-600 text-lg">⚠️</div>
					<div>
						<h3 class="font-medium text-red-900">Error</h3>
						<p class="text-red-700">{error}</p>
					</div>
					<Button onclick={() => activeTab === 'activity' ? loadSessions() : loadWalls()} variant="outline" size="sm" class="ml-auto">
						Try Again
					</Button>
				</div>
			</div>
		{/if}

		{#if loading && (sessions.length === 0 || walls.length === 0)}
			<div class="text-center py-12">
				<div class="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
				<p class="text-gray-500">Loading...</p>
			</div>
		{:else}
			<!-- Activity Tab -->
			{#if activeTab === 'activity'}
				<!-- Wall Filter -->
				{#if availableWalls.length > 0}
					<div class="mb-4 sm:mb-6">
						<label class="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Filter by Wall</label>
						<select 
							bind:value={selectedWallFilter}
							onchange={(e) => handleWallFilterChange((e.target as HTMLSelectElement).value)}
							class="block w-full sm:max-w-xs rounded-md border border-gray-300 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-green-500 focus:ring-green-500"
						>
							<option value="all">All Walls</option>
							{#each availableWalls as wall (wall.id)}
								<option value={wall.id}>{wall.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				{#if filteredSessions.length === 0 && sessions.length > 0}
					<div class="text-center py-16">
						<Activity class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<h3 class="text-xl font-medium text-gray-900 mb-2">No sessions for this wall</h3>
						<p class="text-gray-500 mb-6">Try selecting a different wall or view all sessions</p>
					</div>
				{:else if sessions.length === 0}
					<div class="text-center py-16">
						<Activity class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<h3 class="text-xl font-medium text-gray-900 mb-2">No drawing sessions yet</h3>
						<p class="text-gray-500 mb-6">Start drawing on a wall to see your activity here</p>
						<Button onclick={() => window.location.href = '/'} variant="default">
							<Home class="w-4 h-4 mr-2" />
							Go to Walls
						</Button>
					</div>
				{:else}
					<div class="space-y-4 w-full overflow-y-auto">
						{#each filteredSessions as session (session.session_id)}
							<div class="relative">
								<SessionPreview
									sessionId={session.session_id}
									wallId={session.wall_id}
									wallSlug={session.wall_slug}
									wallName={session.wall_name}
									nodeCount={session.node_count}
									sessionBounds={session.session_bounds}
									createdAt={session.created_at}
									updatedAt={session.updated_at}
									isActive={session.is_active}
									finalizedAt={session.finalized_at}
								/>
								<Button
									onclick={() => handleDeleteSession(session.session_id)}
									variant="ghost"
									size="sm"
									class="absolute top-4 right-4 text-red-600 hover:text-red-700 hover:bg-red-50"
								>
									<Trash2 class="w-4 h-4" />
								</Button>
							</div>
						{/each}
						
						{#if hasMoreSessions}
							<div class="text-center pt-6">
								<Button onclick={handleLoadMore} variant="outline" disabled={loading}>
									{loading ? 'Loading...' : 'Load More Sessions'}
								</Button>
							</div>
						{/if}
					</div>
				{/if}
			
			<!-- Walls Tab -->
			{:else if activeTab === 'walls'}
				{#if walls.length === 0}
					<div class="text-center py-16">
						<Folder class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<h3 class="text-xl font-medium text-gray-900 mb-2">No walls created yet</h3>
						<p class="text-gray-500 mb-6">Create your first wall to get started</p>
						<Button onclick={() => window.location.href = '/'} variant="default">
							<Home class="w-4 h-4 mr-2" />
							Create Wall
						</Button>
					</div>
				{:else}
					<div class="space-y-4 w-full">
						{#each walls as wall (wall.wall_id)}
							<div class="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
								<div class="p-4 sm:p-6">
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2 sm:mb-3">
												<h3 class="text-base sm:text-lg font-semibold text-gray-900">
													<a href="/w/{wall.slug}" class="hover:text-green-600 transition-colors">
														{wall.name}
													</a>
												</h3>
												{#if wall.location}
													<span class="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-0.5 sm:py-1 rounded self-start">
														{wall.location}
													</span>
												{/if}
											</div>
											<div class="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
												{wall.stats.total_sessions} session{wall.stats.total_sessions === 1 ? '' : 's'} • {wall.stats.total_elements} element{wall.stats.total_elements === 1 ? '' : 's'}
											</div>
											<div class="text-xs sm:text-sm text-gray-500">
												Created {formatDate(wall.created_at)}
												{#if wall.last_activity !== wall.created_at}
													<span class="hidden sm:inline">• Last activity {formatDate(wall.last_activity)}</span>
													<span class="sm:hidden block">Last activity {formatDate(wall.last_activity)}</span>
												{/if}
											</div>
										</div>
										<Button
											onclick={() => handleDeleteWall(wall.wall_id)}
											variant="ghost"
											size="sm"
											class="text-red-600 hover:text-red-700 hover:bg-red-50 -mr-2 sm:mr-0"
										>
											<Trash2 class="w-4 h-4" />
										</Button>
									</div>
								</div>
							</div>
						{/each}
						
						{#if hasMoreWalls}
							<div class="text-center pt-6">
								<Button onclick={handleLoadMore} variant="outline" disabled={loading}>
									{loading ? 'Loading...' : 'Load More Walls'}
								</Button>
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		{/if}
	</div>
</div>

<!-- Reset ID Confirmation Dialog -->
<AlertDialog
	open={showResetDialog}
	onConfirm={handleResetId}
	onCancel={() => showResetDialog = false}
	title="Reset Anonymous ID?"
	description="This will disconnect you from all your previous activity and walls. You'll get a new ID and start fresh. This action cannot be undone."
	confirmText="Reset ID"
	cancelText="Cancel"
	destructive={true}
/>
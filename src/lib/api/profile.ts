export interface UserSession {
	session_id: string;
	wall_name: string;
	wall_slug: string;
	wall_id: string;
	node_count: number;
	session_bounds?: {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	} | null;
	session_centroid?: {
		x: number;
		y: number;
	} | null;
	is_active?: boolean; // Optional with default
	created_at: string;
	updated_at: string;
	finalized_at?: string | null; // Optional with default
}

export interface UserWall {
	wall_id: string;
	name: string;
	slug: string;
	location?: string;
	created_at: string;
	last_opened_at?: string;
	last_activity: string;
	stats: {
		total_sessions: number;
		active_sessions: number;
		total_elements: number;
	};
}

export interface PaginationInfo {
	page: number;
	limit: number;
	hasMore: boolean;
}

export interface SessionsResponse {
	sessions: UserSession[];
	pagination: PaginationInfo;
}

export interface WallsResponse {
	walls: UserWall[];
	pagination: PaginationInfo;
}

/**
 * Fetch user's drawing sessions
 */
export async function getUserSessions(page = 1, limit = 20): Promise<SessionsResponse> {
	const response = await fetch(`/api/profile/sessions?page=${page}&limit=${limit}`);
	
	if (!response.ok) {
		throw new Error('Failed to fetch user sessions');
	}
	
	return response.json();
}

/**
 * Fetch user's created walls
 */
export async function getUserWalls(page = 1, limit = 20): Promise<WallsResponse> {
	const response = await fetch(`/api/profile/walls?page=${page}&limit=${limit}`);
	
	if (!response.ok) {
		throw new Error('Failed to fetch user walls');
	}
	
	return response.json();
}

/**
 * Delete a specific session
 */
export async function deleteUserSession(sessionId: string): Promise<void> {
	const response = await fetch(`/api/profile/sessions/${sessionId}`, {
		method: 'DELETE'
	});
	
	if (!response.ok) {
		throw new Error('Failed to delete session');
	}
}

/**
 * Delete a specific wall
 */
export async function deleteUserWall(wallId: string): Promise<void> {
	const response = await fetch(`/api/profile/walls/${wallId}`, {
		method: 'DELETE'
	});
	
	if (!response.ok) {
		throw new Error('Failed to delete wall');
	}
}

/**
 * Reset the user's anonymous ID
 */
export async function resetAnonId(): Promise<void> {
	const response = await fetch('/api/profile/reset-id', {
		method: 'POST'
	});
	
	if (!response.ok) {
		throw new Error('Failed to reset anonymous ID');
	}
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
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

/**
 * Get session thumbnail bounds for display
 */
export function getSessionThumbnailInfo(session: UserSession): {
	width: number;
	height: number;
	isEmpty: boolean;
} {
	if (!session.session_bounds) {
		return { width: 0, height: 0, isEmpty: true };
	}
	
	const { minX, minY, maxX, maxY } = session.session_bounds;
	return {
		width: maxX - minX,
		height: maxY - minY,
		isEmpty: session.node_count === 0
	};
}
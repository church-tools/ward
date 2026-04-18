export type SacramentMeetingItemTableName = 'message' | 'hymn' | 'musical_performance';
export type SacramentMeetingPreviewMode = 'message' | 'hymn' | 'none';

type SmartPositionParams = {
	tableName: SacramentMeetingItemTableName;
	previewMode: SacramentMeetingPreviewMode;
	anchorPosition: number | null;
	allPositions: readonly number[];
	visibleItemCount: number;
};

export function getSmartSacramentMeetingItemPosition(params: SmartPositionParams): number {
	const { tableName, previewMode, anchorPosition, visibleItemCount } = params;
	const allPositions = params.allPositions
		.filter(position => Number.isFinite(position))
		.sort((a, b) => a - b);

	if (previewMode === 'hymn' && isMusicItem(tableName) && visibleItemCount === 0)
		return getDefaultMusicPosition(allPositions);

	if (anchorPosition == null)
		return allPositions.length
			? allPositions[allPositions.length - 1] + 1
			: 0;

	const lower = getLowerBound(allPositions, anchorPosition);
	const upper = getUpperBound(allPositions, anchorPosition);

	let candidate: number;
	if (lower != null && upper != null) {
		candidate = (lower + upper) / 2;
	} else if (lower != null) {
		candidate = lower + 1;
	} else if (upper != null) {
		candidate = upper - 1;
	} else {
		candidate = 0;
	}

	return ensureUniquePosition(candidate, allPositions, lower, upper);
}

function getLowerBound(positions: readonly number[], anchor: number): number | null {
	let lower: number | null = null;
	for (const position of positions) {
		if (position > anchor)
			break;
		lower = position;
	}
	return lower;
}

function getUpperBound(positions: readonly number[], anchor: number): number | null {
	for (const position of positions)
		if (position > anchor)
			return position;
	return null;
}

function ensureUniquePosition(
	candidate: number,
	positions: readonly number[],
	lower: number | null,
	upper: number | null,
): number {
	const positionSet = new Set(positions);
	if (!positionSet.has(candidate))
		return candidate;

	if (lower != null && upper != null) {
		let rightBias = candidate;
		for (let i = 0; i < 12; i++) {
			rightBias = (rightBias + upper) / 2;
			if (!positionSet.has(rightBias))
				return rightBias;

			const leftBias = (lower + rightBias) / 2;
			if (!positionSet.has(leftBias))
				return leftBias;
		}

		const epsilon = Math.max((upper - lower) / 1024, 0.000001);
		const fallback = Math.min(upper - epsilon, Math.max(lower + epsilon, candidate + epsilon));
		if (!positionSet.has(fallback))
			return fallback;
	}

	for (let i = 1; i <= 24; i++) {
		const plus = candidate + i / 1_000_000;
		if (!positionSet.has(plus))
			return plus;

		const minus = candidate - i / 1_000_000;
		if (!positionSet.has(minus))
			return minus;
	}

	return candidate + 0.001;
}

function getDefaultMusicPosition(allPositions: readonly number[]): number {
	if (!allPositions.length)
		return 0;
	if (allPositions.length === 1)
		return allPositions[0] + 1;
	return (allPositions[0] + allPositions[1]) / 2;
}

function isMusicItem(tableName: SacramentMeetingItemTableName): boolean {
	return tableName === 'hymn' || tableName === 'musical_performance';
}

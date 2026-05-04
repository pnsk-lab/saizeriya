import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const officialAccessEnabled = env.ORDERLAB_ALLOW_REMOTE === 'true';

// デフォルトではdry-run。
// ORDERLAB_DRY_RUN=false を明示したときだけ実送信を許可する。
export const dryRunEnabled = env.ORDERLAB_DRY_RUN !== 'false';

export const officialAccessBlockedResponse = () =>
	json(
		{
			error:
				'Remote service access is disabled by default. Use the local mock server for testing.'
		},
		{ status: 403 }
	);

export const writeOperationBlockedResponse = () =>
	json(
		{
			error:
				'Write operations are disabled in dry-run mode. This app is configured as a sandbox.'
		},
		{ status: 403 }
	);
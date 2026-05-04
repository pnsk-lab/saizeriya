import { json, type RequestHandler } from '@sveltejs/kit'
import { callOfficialStaff, parseOfficialSessionSnapshot } from '$lib/server/official-client'
import { dryRunEnabled } from '$lib/server/safety';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json().catch(() => ({}));

		if (dryRunEnabled) {
			return json({
				dryRun: true,
				message: 'Staff call is disabled in sandbox mode.',
				after: Boolean(body.after)
			});
		}

		return json(
			await callOfficialStaff(
				params.id ?? '',
				Boolean(body.after),
				parseOfficialSessionSnapshot(body.officialSession)
			)
		);
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to call staff' },
			{ status: 502 }
		);
	}
};
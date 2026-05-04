import { json, type RequestHandler } from '@sveltejs/kit';
import { createOfficialSession, serializeState } from '$lib/server/official-client';
import { officialAccessBlockedResponse, officialAccessEnabled } from '$lib/server/safety';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const qrURLSource = String(body.qrURLSource ?? '').trim();

	if (!URL.canParse(qrURLSource)) {
		return json({ error: 'QR URL is invalid' }, { status: 400 });
	}

	if (!officialAccessEnabled) {
		return officialAccessBlockedResponse();
	}

	try {
		const session = await createOfficialSession(qrURLSource);
		return json({
			id: session.id,
			state: serializeState(session.state),
			officialSession: session.officialSession
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to start session' },
			{ status: 502 }
		);
	}
};
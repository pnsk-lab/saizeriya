<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import QrScanner from 'qr-scanner';

	type ClientState = {
		baseURL?: string;
		nextId: string;
		shopId: number;
		tableNo: number;
		peopleCount: number;
		pageKind: string;
		cart: Array<{
			id: string;
			name?: string;
			price?: number;
			count: number;
		}>;
	};

	type OfficialSessionSnapshot = {
		id: string;
		state: ClientState & { baseURL: string };
		cookies: [string, string][];
		createdAt: number;
		updatedAt: number;
	};

	type PendingSession = {
		id: string;
		state: ClientState;
		officialSession: OfficialSessionSnapshot;
		url: string;
	};

	type CameraOption = {
		id: string;
		label: string;
	};

	let qrURL = $state('');
	let peopleCount = $state(2);
	let pendingSession = $state<PendingSession | null>(null);
	let error = $state('');
	let busy = $state(false);
	let scannerActive = $state(false);
	let scannerReady = $state(false);
	let cameras = $state<CameraOption[]>([]);
	let selectedCameraId = $state('');
	let cameraBusy = $state(false);
	let video: HTMLVideoElement | null = null;
	let confirmDialog: HTMLDialogElement | null = null;
	let peopleDialog: HTMLDialogElement | null = null;
	let manualDialog: HTMLDialogElement | null = null;
	let scanner: QrScanner | null = null;

	const officialSessionStorageKey = (id: string) => `betterzeriya:${id}:official-session`;

	const saveOfficialSession = (snapshot: OfficialSessionSnapshot) => {
		sessionStorage.setItem(officialSessionStorageKey(snapshot.id), JSON.stringify(snapshot));
	};

	async function requestJSON<T>(path: string, body?: unknown): Promise<T> {
		busy = true;
		error = '';
		try {
			const response = await fetch(path, {
				method: body ? 'POST' : 'GET',
				headers: body ? { 'content-type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.error ?? 'Request failed');
			}
			return payload as T;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : '通信に失敗しました';
			throw caught;
		} finally {
			busy = false;
		}
	}

	const openManualDialog = () => {
		error = '';
		manualDialog?.showModal();
	};

	const prepareSession = async (value: string) => {
		const nextURL = value.trim();
		if (!nextURL.toLowerCase().includes('saizeriya')) {
			return;
		}
		if (!URL.canParse(nextURL)) {
			error = '公式 QR の URL として読み取れませんでした。';
			return;
		}
		if (busy || pendingSession) {
			return;
		}

		qrURL = nextURL;
		try {
			const result = await requestJSON<{
				id: string;
				state: ClientState;
				officialSession: OfficialSessionSnapshot;
			}>('/api/sessions', {
				qrURLSource: nextURL
			});
			saveOfficialSession(result.officialSession);
			pendingSession = { ...result, url: nextURL };
			if (result.state.peopleCount > 0) {
				peopleCount = result.state.peopleCount;
			}
			await stopScanner();
			if (manualDialog?.open) {
				manualDialog.close();
			}
			confirmDialog?.showModal();
		} catch {}
	};

	const submitManualURL = async () => {
		if (!qrURL.trim()) {
			error = '公式 QR URL を入力してください。';
			return;
		}
		if (!qrURL.toLowerCase().includes('saizeriya')) {
			error = 'saizeriya を含む公式 QR URL を入力してください。';
			return;
		}
		await prepareSession(qrURL);
	};

	const confirmSession = async () => {
		if (!pendingSession) {
			return;
		}
		confirmDialog?.close();
		if (pendingSession.state.peopleCount > 0) {
			await selectPeopleCount(pendingSession.state.peopleCount);
			return;
		}
		peopleDialog?.showModal();
	};

	const openPeopleDialog = () => {
		if (confirmDialog?.open) {
			confirmDialog.close();
		}
		peopleDialog?.showModal();
	};

	const selectPeopleCount = async (count: number) => {
		if (!pendingSession) {
			return;
		}

		try {
			const result = await requestJSON<{ state: ClientState; officialSession: OfficialSessionSnapshot }>(
				`/api/sessions/${pendingSession.id}/people`,
				{ peopleCount: count, officialSession: pendingSession.officialSession }
			);
			saveOfficialSession(result.officialSession);
			peopleCount = result.state.peopleCount;
			await goto(`/sessions/${pendingSession.id}`);
		} catch {}
	};

	const cancelSession = async () => {
		pendingSession = null;
		if (confirmDialog?.open) {
			confirmDialog.close();
		}
		if (peopleDialog?.open) {
			peopleDialog.close();
		}
		await startScanner();
	};

	const loadCameras = async () => {
		try {
			const nextCameras = await QrScanner.listCameras(true);
			cameras = nextCameras;
			if (!selectedCameraId && nextCameras.length > 0) {
				const environmentCamera =
					nextCameras.find((camera) => /back|rear|environment|外|背面/i.test(camera.label)) ??
					nextCameras.at(-1);
				selectedCameraId = environmentCamera?.id ?? nextCameras[0]?.id ?? '';
			}
		} catch {
			cameras = [];
		}
	};

	const switchCamera = async () => {
		if (!scanner || cameraBusy || cameras.length < 2) {
			return;
		}

		cameraBusy = true;
		error = '';
		try {
			const currentIndex = Math.max(
				0,
				cameras.findIndex((camera) => camera.id === selectedCameraId)
			);
			const nextCamera = cameras[(currentIndex + 1) % cameras.length];
			if (!nextCamera) {
				return;
			}
			await scanner.setCamera(nextCamera.id);
			selectedCameraId = nextCamera.id;
		} catch {
			error = 'カメラを切り替えられませんでした。';
		} finally {
			cameraBusy = false;
		}
	};

	const startScanner = async () => {
		error = '';
		if (scannerActive || busy || pendingSession) {
			return;
		}
		if (!video) {
			error = 'カメラを開始できませんでした。下部から URL を入力してください。';
			return;
		}

		try {
			if (!scanner) {
				scanner = new QrScanner(
					video,
					(result) => {
						const value = result.data;
						if (value.toLowerCase().includes('saizeriya')) {
							void prepareSession(value);
						}
					},
					{
						preferredCamera: selectedCameraId || 'environment',
						maxScansPerSecond: 8,
						returnDetailedScanResult: true
					}
				);
			}
			await scanner.start();
			scannerActive = true;
			scannerReady = true;
			await loadCameras();
		} catch {
			error = 'カメラを開始できませんでした。下部から URL を入力してください。';
			scannerActive = false;
			scannerReady = false;
		}
	};

	const stopScanner = async () => {
		scannerActive = false;
		scanner?.stop();
	};

	const destroyScanner = () => {
		scannerActive = false;
		scanner?.destroy();
		scanner = null;
	};

	const toggleFlash = async () => {
		try {
			await scanner?.toggleFlash();
		} catch {
			error = 'この端末ではライトを操作できません。';
		}
	};

	onMount(() => {
		void startScanner();
	});

	onDestroy(() => {
		destroyScanner();
	});
</script>

<svelte:head>
	<title>ご注文はこちら</title>
	<meta name="description" content="サイゼリヤ公式モバイルオーダー互換クライアント" />
</svelte:head>

<main class="scanner-page">
	<video bind:this={video} class="scanner-video" muted playsinline aria-label="QR リーダー"></video>

	<div class="scanner-shade" aria-hidden="true">
		<div class="scanner-target">
			<span></span>
		</div>
	</div>

	<header class="scanner-top">
		<button class="scanner-icon-button" aria-label="閉じる" onclick={stopScanner}>
			<span class="i-tabler-x"></span>
		</button>
		<strong>ご注文はこちら</strong>
		<button
			class="scanner-icon-button right"
			aria-label="カメラ切り替え"
			onclick={switchCamera}
			disabled={cameraBusy || cameras.length < 2}
		>
			<span class="i-tabler-camera-rotate"></span>
		</button>
	</header>

	<div class="scanner-tabs" role="tablist" aria-label="入力方法">
		<button class="active" role="tab" aria-selected="true">
			<span class="i-tabler-qrcode"></span>
			QR 読み取り
		</button>
		<button role="tab" aria-selected="false" onclick={openManualDialog}>
			<span class="i-tabler-link"></span>
			URL 入力
		</button>
	</div>

	{#if error}
		<div class="scanner-alert" role="alert">{error}</div>
	{/if}

	<div class="scanner-bottom">
		<div class="scanner-status">
			<button class="flashlight-button" aria-label="ライト" onclick={toggleFlash}>
				<span class="i-tabler-flashlight"></span>
			</button>
			<span>{busy ? 'テーブルを確認しています' : scannerActive ? 'テーブルにある QR コードを読み取ってください' : scannerReady ? '停止中です' : 'カメラを起動しています'}</span>
			{#if cameras.length > 1}
				<small>{cameras.find((camera) => camera.id === selectedCameraId)?.label ?? 'カメラ選択中'}</small>
			{/if}
		</div>
		<button class="manual-link" onclick={openManualDialog}>
			<span class="i-tabler-help-circle"></span>
			読み取れない場合
		</button>
	</div>
</main>

<dialog bind:this={confirmDialog} class="app-dialog">
	{#if pendingSession}
		<form method="dialog" class="dialog-body">
			<p class="eyebrow">Confirm</p>
			<h2>
				{pendingSession.state.tableNo} テーブル{pendingSession.state.peopleCount > 0
					? ` / ${pendingSession.state.peopleCount} 名様`
					: ''}で間違いないですか？
			</h2>
			<div class="dialog-meta">
				<span>Shop {pendingSession.state.shopId}</span>
				{#if pendingSession.state.peopleCount > 0}
					<span>{pendingSession.state.peopleCount} 名様</span>
				{/if}
			</div>
			<div class="dialog-actions" class:three={pendingSession.state.peopleCount > 0}>
				<button class="secondary" type="button" onclick={cancelSession}>読み直す</button>
				{#if pendingSession.state.peopleCount > 0}
					<button class="secondary" type="button" onclick={openPeopleDialog}>人数変更</button>
					<button class="primary" type="button" onclick={confirmSession}>注文へ進む</button>
				{:else}
					<button class="primary" type="button" onclick={confirmSession}>次へ</button>
				{/if}
			</div>
		</form>
	{/if}
</dialog>

<dialog bind:this={peopleDialog} class="app-dialog">
	{#if pendingSession}
		<form method="dialog" class="dialog-body" onsubmit={(event) => event.preventDefault()}>
			<p class="eyebrow">People</p>
			<h2>何名様でご利用ですか？</h2>
			<div class="people-grid">
				{#each [1, 2, 3, 4, 5, 6, 7, 8] as count}
					<button class="secondary" type="button" onclick={() => selectPeopleCount(count)}>
						{count} 人
					</button>
				{/each}
			</div>
			<label>
				<span>9 人以上</span>
				<input bind:value={peopleCount} type="number" min="1" max="99" />
			</label>
			<div class="dialog-actions">
				<button class="secondary" type="button" onclick={() => peopleDialog?.close()}>戻る</button>
				<button class="primary" type="button" onclick={() => selectPeopleCount(peopleCount)} disabled={busy}>
					確定
				</button>
			</div>
		</form>
	{/if}
</dialog>

<dialog bind:this={manualDialog} class="app-dialog">
	<form method="dialog" class="dialog-body" onsubmit={(event) => event.preventDefault()}>
		<p class="eyebrow">Manual</p>
		<h2>QR URL を入力</h2>
		<label>
			<span>公式 QR URL</span>
			<input bind:value={qrURL} placeholder="https://ioes.saizeriya.co.jp/..." inputmode="url" />
		</label>
		<div class="dialog-actions">
			<button class="secondary" type="button" onclick={() => manualDialog?.close()}>閉じる</button>
			<button class="primary" type="button" onclick={submitManualURL} disabled={busy}>接続</button>
		</div>
	</form>
</dialog>

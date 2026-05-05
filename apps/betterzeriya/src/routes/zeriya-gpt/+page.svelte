<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import QrScanner from 'qr-scanner';
	import { buildSystemPrompt } from '$lib/zeriya-gpt/system-prompt';

	type ChatRole = 'user' | 'assistant';
	type ChatMessage = { role: ChatRole; content: string };

	const SCAN_FLAG_KEY = 'betterzeriya:zeriya-gpt:scanned';

	type ModelOption = {
		id: string;
		label: string;
		hint: string;
	};

	const modelOptions: ModelOption[] = [
		{
			id: 'Qwen3-0.6B-q4f16_1-MLC',
			label: 'Qwen3 0.6B',
			hint: '初回 ~400MB · 最軽量'
		},
		{
			id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
			label: 'Llama 3.2 1B',
			hint: '初回 ~750MB · 軽量・サクサク'
		},
		{
			id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
			label: 'Llama 3.2 3B',
			hint: '初回 ~1.7GB · より賢い'
		},
		{
			id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
			label: 'Qwen2.5 1.5B',
			hint: '初回 ~950MB · 日本語そこそこ'
		}
	];

	const samplePrompts = [
		'1000円以内でお腹いっぱいになる組み合わせは?',
		'2人で3000円。ワインに合うおすすめ教えて',
		'子どもが喜ぶサイドメニューは?',
		'カロリー控えめで満足できる注文を考えて'
	];

	let selectedModel = $state(modelOptions[0].id);
	let webgpuSupported = $state(true);
	let engine = $state<unknown>(null);
	let engineLoading = $state(false);
	let loadProgress = $state(0);
	let loadText = $state('');
	let messages = $state<ChatMessage[]>([]);
	let input = $state('');
	let generating = $state(false);
	let error = $state('');
	let listEl: HTMLDivElement | null = $state(null);
	let textareaEl: HTMLTextAreaElement | null = $state(null);

	let unlocked = $state(false);
	let scanError = $state('');
	let scannerActive = $state(false);
	let cameraStarting = $state(false);
	let videoEl: HTMLVideoElement | null = $state(null);
	let scanner: QrScanner | null = null;

	const isCloseToBottom = () => {
		if (!listEl) return true;
		return listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;
	};

	const scrollToBottom = async () => {
		await tick();
		if (listEl) listEl.scrollTop = listEl.scrollHeight;
	};

	const detectWebGPU = () => {
		if (typeof navigator === 'undefined') return false;
		return 'gpu' in navigator;
	};

	const loadEngine = async () => {
		if (engineLoading) return;
		error = '';
		engineLoading = true;
		loadProgress = 0;
		loadText = 'モデルを準備しています…';
		try {
			const { CreateMLCEngine, prebuiltAppConfig } = await import('@mlc-ai/web-llm');
			const next = await CreateMLCEngine(selectedModel, {
				initProgressCallback: (report: { progress: number; text: string }) => {
					loadProgress = Math.max(0, Math.min(1, report.progress ?? 0));
					loadText = report.text || loadText;
				},
				appConfig: {
					...prebuiltAppConfig,
					useIndexedDBCache: true
				}
			});
			engine = next;
			loadText = '準備完了';
		} catch (caught) {
			engine = null;
			error = caught instanceof Error ? caught.message : 'モデル読み込みに失敗しました';
		} finally {
			engineLoading = false;
		}
	};

	const ensureEngine = async () => {
		if (!engine && !engineLoading) {
			await loadEngine();
		}
	};

	const handleSend = async () => {
		const trimmed = input.trim();
		if (!trimmed || generating || engineLoading) return;
		if (!webgpuSupported) {
			error = 'このブラウザは WebGPU に対応していません。';
			return;
		}
		await ensureEngine();
		if (!engine) return;

		input = '';
		messages = [...messages, { role: 'user', content: trimmed }];
		messages = [...messages, { role: 'assistant', content: '' }];
		generating = true;
		error = '';
		await scrollToBottom();

		try {
			const requestMessages = [
				{ role: 'system', content: buildSystemPrompt() },
				...messages
					.slice(0, -1)
					.map((m) => ({ role: m.role, content: m.content }))
			];

			const stream = await (engine as {
				chat: { completions: { create: (args: unknown) => Promise<AsyncIterable<unknown>> } };
			}).chat.completions.create({
				messages: requestMessages,
				stream: true,
				temperature: 0.7,
				max_tokens: 800
			});

			for await (const rawChunk of stream) {
				const chunk = rawChunk as {
					choices?: { delta?: { content?: string } }[];
				};
				const delta = chunk.choices?.[0]?.delta?.content ?? '';
				if (!delta) continue;
				const stickToBottom = isCloseToBottom();
				const last = messages[messages.length - 1];
				messages = [
					...messages.slice(0, -1),
					{ role: last.role, content: last.content + delta }
				];
				if (stickToBottom) await scrollToBottom();
			}
		} catch (caught) {
			error = caught instanceof Error ? caught.message : '応答中にエラーが発生しました';
		} finally {
			generating = false;
		}
	};

	const handleInterrupt = async () => {
		if (!engine || !generating) return;
		try {
			await (engine as { interruptGenerate: () => Promise<void> }).interruptGenerate();
		} catch {}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			void handleSend();
		}
	};

	const autoGrow = () => {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, 220)}px`;
	};

	const fillSample = (prompt: string) => {
		input = prompt;
		autoGrow();
		textareaEl?.focus();
	};

	const resetChat = () => {
		if (generating) return;
		messages = [];
		error = '';
	};

	const switchModel = async (id: string) => {
		if (generating || engineLoading || id === selectedModel) return;
		selectedModel = id;
		engine = null;
		await loadEngine();
	};

	const stopScanner = () => {
		scannerActive = false;
		try {
			scanner?.stop();
		} catch {}
	};

	const destroyScanner = () => {
		scannerActive = false;
		try {
			scanner?.destroy();
		} catch {}
		scanner = null;
	};

	const handleScanResult = (value: string) => {
		const text = value.trim();
		if (!text.toLowerCase().includes('saizeriya')) {
			scanError = 'サイゼリヤの QR コードではないようです。';
			return;
		}
		scanError = '';
		try {
			sessionStorage.setItem(SCAN_FLAG_KEY, String(Date.now()));
		} catch {}
		stopScanner();
		unlocked = true;
	};

	const startScanner = async () => {
		if (scannerActive || cameraStarting || unlocked) return;
		if (!videoEl) return;
		cameraStarting = true;
		scanError = '';
		try {
			if (!scanner) {
				scanner = new QrScanner(
					videoEl,
					(result) => {
						handleScanResult(result.data);
					},
					{
						preferredCamera: 'environment',
						maxScansPerSecond: 6,
						returnDetailedScanResult: true
					}
				);
			}
			await scanner.start();
			scannerActive = true;
		} catch {
			scanError = 'カメラを起動できませんでした。';
		} finally {
			cameraStarting = false;
		}
	};

	const relock = () => {
		try {
			sessionStorage.removeItem(SCAN_FLAG_KEY);
		} catch {}
		unlocked = false;
	};

	onMount(() => {
		webgpuSupported = detectWebGPU();
		if (!webgpuSupported) {
			error = 'このブラウザは WebGPU に未対応です。Chrome / Edge デスクトップ版でお試しください。';
		}
		try {
			if (sessionStorage.getItem(SCAN_FLAG_KEY)) {
				unlocked = true;
			}
		} catch {}
	});

	onDestroy(() => {
		destroyScanner();
	});

	$effect(() => {
		if (!unlocked && videoEl && !scannerActive) {
			void startScanner();
		}
		if (unlocked && scanner) {
			destroyScanner();
		}
	});
</script>

<svelte:head>
	<title>zeriyaGPT</title>
	<meta name="description" content="ブラウザ内で動くサイゼリヤ提案 AI (WebGPU)" />
</svelte:head>

<div class="zg-app">
	<header class="zg-header">
		<a href="/" class="zg-back" aria-label="戻る">
			<span class="i-tabler-arrow-left"></span>
		</a>
		<div class="zg-title">
			<strong>zeriyaGPT</strong>
			<small>WebGPU で動くブラウザ完結型アシスタント</small>
		</div>
		{#if unlocked}
			<button
				class="zg-icon-button"
				type="button"
				onclick={resetChat}
				disabled={generating || messages.length === 0}
				aria-label="会話をリセット"
			>
				<span class="i-tabler-refresh"></span>
			</button>
		{:else}
			<span class="zg-icon-button" aria-hidden="true">
				<span class="i-tabler-lock"></span>
			</span>
		{/if}
	</header>

	{#if !unlocked}
		<div class="zg-gate">
			<div class="zg-gate-card">
				<div class="zg-gate-mark">Z</div>
				<h1>サイゼに来てから話そう</h1>
				<p>テーブルの公式 QR を読み取るとチャットを開始できます。</p>

				<div class="zg-gate-camera">
					<!-- svelte-ignore a11y_media_has_caption -->
					<video bind:this={videoEl} muted playsinline></video>
					<div class="zg-gate-frame" aria-hidden="true">
						<span></span>
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>

				<small class="zg-gate-status">
					{#if cameraStarting}
						カメラを起動しています…
					{:else if scannerActive}
						テーブルの QR コードを枠内に映してください
					{:else}
						カメラを起動できませんでした
					{/if}
				</small>

				{#if scanError}
					<div class="zg-alert" role="alert">{scanError}</div>
				{/if}
			</div>
		</div>
	{:else}
	<div class="zg-model-bar">
		{#each modelOptions as opt (opt.id)}
			<button
				class="zg-model-chip"
				class:active={opt.id === selectedModel}
				type="button"
				onclick={() => switchModel(opt.id)}
				disabled={generating || engineLoading}
			>
				<strong>{opt.label}</strong>
				<small>{opt.hint}</small>
			</button>
		{/each}
	</div>

	{#if engineLoading}
		<div class="zg-loading" role="status">
			<div class="zg-loading-track">
				<div class="zg-loading-bar" style="width: {Math.round(loadProgress * 100)}%"></div>
			</div>
			<small>{loadText}</small>
		</div>
	{/if}

	{#if error}
		<div class="zg-alert" role="alert">{error}</div>
	{/if}

	<div class="zg-list" bind:this={listEl}>
		{#if messages.length === 0}
			<div class="zg-empty">
				<div class="zg-empty-mark">Z</div>
				<h1>今日はどんなサイゼ？</h1>
				<p>予算・気分・人数を伝えてくれれば、メニューから提案します。</p>
				<div class="zg-samples">
					{#each samplePrompts as prompt (prompt)}
						<button type="button" onclick={() => fillSample(prompt)}>{prompt}</button>
					{/each}
				</div>
				<p class="zg-note">
					※ モデルは初回のみダウンロード(~750MB〜)。以降はブラウザにキャッシュされます。
				</p>
			</div>
		{:else}
			{#each messages as message, index (index)}
				<div class="zg-row" class:user={message.role === 'user'}>
					<div class="zg-avatar" aria-hidden="true">
						{message.role === 'user' ? 'You' : 'Z'}
					</div>
					<div class="zg-bubble">
						{#if message.content}
							<p>{message.content}</p>
						{:else}
							<span class="zg-typing"><i></i><i></i><i></i></span>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<div class="zg-composer">
		<div class="zg-composer-inner">
			<textarea
				bind:this={textareaEl}
				bind:value={input}
				oninput={autoGrow}
				onkeydown={handleKeydown}
				placeholder={engineLoading
					? 'モデルを準備中…'
					: webgpuSupported
						? 'メッセージを入力 (Enter で送信)'
						: 'WebGPU 対応ブラウザでアクセスしてください'}
				disabled={!webgpuSupported}
				rows="1"
			></textarea>
			{#if generating}
				<button class="zg-send stop" type="button" onclick={handleInterrupt} aria-label="停止">
					<span class="i-tabler-player-stop-filled"></span>
				</button>
			{:else}
				<button
					class="zg-send"
					type="button"
					onclick={handleSend}
					disabled={!input.trim() || engineLoading || !webgpuSupported}
					aria-label="送信"
				>
					<span class="i-tabler-arrow-up"></span>
				</button>
			{/if}
		</div>
		<small class="zg-hint">
			ブラウザ内で完結 · 入力内容はサーバーに送信されません
		</small>
	</div>
	{/if}
</div>

<style>
	:global(body) {
		background: #f6f7f9;
	}

	.zg-app {
		display: grid;
		grid-template-rows: auto auto auto auto minmax(0, 1fr) auto;
		min-height: 100svh;
		max-width: 860px;
		margin: 0 auto;
		padding: 0 16px;
	}

	.zg-header {
		position: sticky;
		top: 0;
		z-index: 4;
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr) 40px;
		align-items: center;
		gap: 12px;
		padding: 14px 0;
		background: rgba(246, 247, 249, 0.92);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid rgba(17, 24, 39, 0.06);
	}

	.zg-back,
	.zg-icon-button {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 1px solid rgba(17, 24, 39, 0.1);
		border-radius: 999px;
		background: #ffffff;
		color: #111827;
		font-size: 20px;
		text-decoration: none;
	}

	.zg-icon-button:disabled {
		opacity: 0.4;
	}

	.zg-title {
		display: grid;
		gap: 2px;
		justify-items: center;
		text-align: center;
	}

	.zg-title strong {
		font-size: 16px;
		font-weight: 800;
		color: #111827;
	}

	.zg-title small {
		font-size: 11px;
		color: #6b7280;
		font-weight: 700;
	}

	.zg-model-bar {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding: 12px 0 4px;
	}

	.zg-model-chip {
		flex: 0 0 auto;
		display: grid;
		gap: 2px;
		padding: 8px 14px;
		border: 1px solid rgba(17, 24, 39, 0.12);
		border-radius: 999px;
		background: #ffffff;
		color: #374151;
		text-align: left;
		font-weight: 700;
	}

	.zg-model-chip strong {
		font-size: 13px;
	}

	.zg-model-chip small {
		font-size: 11px;
		color: #6b7280;
		font-weight: 700;
	}

	.zg-model-chip.active {
		border-color: #166534;
		background: #ecfdf5;
		color: #166534;
	}

	.zg-model-chip.active small {
		color: #166534;
	}

	.zg-model-chip:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.zg-loading {
		display: grid;
		gap: 6px;
		padding: 12px 14px;
		margin: 8px 0;
		border: 1px solid rgba(22, 101, 52, 0.18);
		border-radius: 12px;
		background: #ecfdf5;
		color: #166534;
		font-weight: 700;
	}

	.zg-loading-track {
		height: 6px;
		border-radius: 999px;
		background: rgba(22, 101, 52, 0.16);
		overflow: hidden;
	}

	.zg-loading-bar {
		height: 100%;
		background: #16a34a;
		transition: width 240ms ease;
	}

	.zg-loading small {
		font-size: 12px;
		color: #166534;
	}

	.zg-alert {
		padding: 12px 14px;
		margin: 8px 0;
		border-radius: 12px;
		background: #fef2f2;
		color: #991b1b;
		font-weight: 700;
	}

	.zg-list {
		display: grid;
		align-content: start;
		gap: 18px;
		padding: 18px 4px 24px;
		overflow-y: auto;
	}

	.zg-empty {
		display: grid;
		justify-items: center;
		gap: 10px;
		padding: 40px 8px 8px;
		text-align: center;
		color: #374151;
	}

	.zg-empty-mark {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 18px;
		background: linear-gradient(135deg, #16a34a, #166534);
		color: #ffffff;
		font-weight: 900;
		font-size: 26px;
		letter-spacing: 0.5px;
	}

	.zg-empty h1 {
		margin: 6px 0 0;
		font-size: 22px;
		color: #111827;
	}

	.zg-empty p {
		margin: 0;
		font-size: 14px;
		color: #6b7280;
	}

	.zg-samples {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		width: 100%;
		max-width: 540px;
		margin-top: 14px;
	}

	.zg-samples button {
		padding: 12px 14px;
		border: 1px solid rgba(17, 24, 39, 0.1);
		border-radius: 12px;
		background: #ffffff;
		color: #111827;
		font-size: 13px;
		font-weight: 700;
		text-align: left;
		line-height: 1.4;
	}

	.zg-samples button:hover {
		border-color: rgba(22, 101, 52, 0.4);
		background: #f0fdf4;
	}

	.zg-note {
		margin-top: 14px;
		font-size: 11px;
		color: #9ca3af;
	}

	.zg-row {
		display: grid;
		grid-template-columns: 32px minmax(0, 1fr);
		gap: 12px;
	}

	.zg-row.user {
		grid-template-columns: minmax(0, 1fr) 32px;
	}

	.zg-row.user .zg-avatar {
		grid-column: 2;
		grid-row: 1;
	}

	.zg-row.user .zg-bubble {
		grid-column: 1;
		grid-row: 1;
		justify-self: end;
		background: #111827;
		color: #ffffff;
	}

	.zg-avatar {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		background: linear-gradient(135deg, #16a34a, #166534);
		color: #ffffff;
		font-size: 11px;
		font-weight: 900;
	}

	.zg-row.user .zg-avatar {
		background: #111827;
	}

	.zg-bubble {
		max-width: 84%;
		border-radius: 16px;
		padding: 12px 14px;
		background: #ffffff;
		border: 1px solid rgba(17, 24, 39, 0.06);
		color: #111827;
		line-height: 1.55;
		box-shadow: 0 1px 2px rgba(17, 24, 39, 0.04);
	}

	.zg-bubble p {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 14.5px;
	}

	.zg-typing {
		display: inline-flex;
		gap: 4px;
	}

	.zg-typing i {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: #9ca3af;
		animation: zg-blink 1.2s infinite ease-in-out;
	}

	.zg-typing i:nth-child(2) {
		animation-delay: 0.2s;
	}

	.zg-typing i:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes zg-blink {
		0%, 80%, 100% {
			opacity: 0.25;
			transform: translateY(0);
		}
		40% {
			opacity: 1;
			transform: translateY(-2px);
		}
	}

	.zg-composer {
		position: sticky;
		bottom: 0;
		padding: 10px 0 max(14px, env(safe-area-inset-bottom));
		background: linear-gradient(180deg, rgba(246, 247, 249, 0) 0%, #f6f7f9 24%);
	}

	.zg-composer-inner {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 44px;
		gap: 8px;
		align-items: end;
		padding: 8px;
		border: 1px solid rgba(17, 24, 39, 0.12);
		border-radius: 22px;
		background: #ffffff;
		box-shadow: 0 14px 40px rgba(17, 24, 39, 0.08);
	}

	.zg-composer-inner textarea {
		width: 100%;
		min-height: 32px;
		max-height: 220px;
		border: 0;
		padding: 8px 10px;
		background: transparent;
		color: #111827;
		font-size: 15px;
		font-family: inherit;
		resize: none;
		outline: none;
		line-height: 1.5;
	}

	.zg-composer-inner textarea:disabled {
		color: #9ca3af;
	}

	.zg-send {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 50%;
		background: #111827;
		color: #ffffff;
		font-size: 20px;
	}

	.zg-send:disabled {
		background: #d1d5db;
		color: #ffffff;
	}

	.zg-send.stop {
		background: #b91c1c;
	}

	.zg-hint {
		display: block;
		margin-top: 8px;
		font-size: 11px;
		color: #9ca3af;
		text-align: center;
		font-weight: 700;
	}

	@media (max-width: 540px) {
		.zg-samples {
			grid-template-columns: 1fr;
		}
	}

	.zg-gate {
		display: grid;
		place-items: center;
		padding: 32px 4px;
	}

	.zg-gate-card {
		display: grid;
		justify-items: center;
		gap: 14px;
		width: 100%;
		max-width: 480px;
		padding: 28px 24px;
		border: 1px solid rgba(17, 24, 39, 0.08);
		border-radius: 22px;
		background: #ffffff;
		box-shadow: 0 18px 50px rgba(17, 24, 39, 0.08);
		text-align: center;
	}

	.zg-gate-mark {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 18px;
		background: linear-gradient(135deg, #16a34a, #166534);
		color: #ffffff;
		font-size: 26px;
		font-weight: 900;
	}

	.zg-gate-card h1 {
		margin: 4px 0 0;
		font-size: 20px;
		color: #111827;
	}

	.zg-gate-card p {
		margin: 0;
		font-size: 13px;
		color: #6b7280;
	}

	.zg-gate-camera {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		max-width: 320px;
		overflow: hidden;
		border-radius: 18px;
		background: #030712;
	}

	.zg-gate-camera video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.zg-gate-frame {
		position: absolute;
		inset: 16%;
		pointer-events: none;
	}

	.zg-gate-frame span {
		position: absolute;
		width: 22px;
		height: 22px;
		border-color: #ffffff;
	}

	.zg-gate-frame span:nth-child(1) {
		top: 0;
		left: 0;
		border-top: 3px solid;
		border-left: 3px solid;
		border-radius: 6px 0 0 0;
	}

	.zg-gate-frame span:nth-child(2) {
		top: 0;
		right: 0;
		border-top: 3px solid;
		border-right: 3px solid;
		border-radius: 0 6px 0 0;
	}

	.zg-gate-frame span:nth-child(3) {
		bottom: 0;
		left: 0;
		border-bottom: 3px solid;
		border-left: 3px solid;
		border-radius: 0 0 0 6px;
	}

	.zg-gate-frame span:nth-child(4) {
		bottom: 0;
		right: 0;
		border-bottom: 3px solid;
		border-right: 3px solid;
		border-radius: 0 0 6px 0;
	}

	.zg-gate-status {
		font-size: 12px;
		color: #6b7280;
		font-weight: 700;
	}
</style>

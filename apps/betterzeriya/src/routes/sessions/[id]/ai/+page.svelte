<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { buildSystemPrompt } from '$lib/zeriya-gpt/system-prompt';

	type ChatRole = 'user' | 'assistant';
	type ChatMessage = { role: ChatRole; content: string };

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

	let { data } = $props<{ data: { sessionId: string } }>();

	const sessionHref = $derived(`/sessions/${data.sessionId}`);

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

	const getWebGPU = () =>
		typeof navigator === 'undefined' ? null : ((navigator as Navigator & { gpu?: GPU }).gpu ?? null);

	const installWebGPUAdapterFallback = () => {
		const gpu = getWebGPU() as (GPU & { __betterzeriyaAdapterFallback?: true }) | null;
		if (!gpu || gpu.__betterzeriyaAdapterFallback) return;

		const requestAdapter = gpu.requestAdapter.bind(gpu);
		try {
			Object.defineProperty(gpu, 'requestAdapter', {
				configurable: true,
				value: async (options?: GPURequestAdapterOptions) => {
					const adapter = await requestAdapter(options);
					if (adapter || !options?.powerPreference) {
						return adapter;
					}
					return (
						(await requestAdapter()) ??
						(await requestAdapter({
							powerPreference:
								options.powerPreference === 'high-performance' ? 'low-power' : 'high-performance'
						}))
					);
				}
			});
			gpu.__betterzeriyaAdapterFallback = true;
		} catch {}
	};

	const isCloseToBottom = () => {
		if (!listEl) return true;
		return listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80;
	};

	const scrollToBottom = async () => {
		await tick();
		if (listEl) listEl.scrollTop = listEl.scrollHeight;
	};

	const detectWebGPU = () => {
		return Boolean(getWebGPU());
	};

	const verifyWebGPUAdapter = async () => {
		const gpu = getWebGPU();
		if (!gpu) return false;
		const adapter =
			(await gpu.requestAdapter({ powerPreference: 'high-performance' })) ??
			(await gpu.requestAdapter()) ??
			(await gpu.requestAdapter({ powerPreference: 'low-power' }));
		return Boolean(adapter);
	};

	const loadEngine = async () => {
		if (engineLoading) return;
		error = '';
		engineLoading = true;
		loadProgress = 0;
		loadText = 'モデルを準備しています…';
		try {
			installWebGPUAdapterFallback();
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
			const message = caught instanceof Error ? caught.message : 'モデル読み込みに失敗しました';
			error = message.includes('Unable to find a compatible GPU')
				? 'WebGPU adapter を取得できませんでした。ブラウザのハードウェアアクセラレーション、GPUドライバ、chrome://gpu の WebGPU 状態を確認してください。'
				: message;
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

	onMount(() => {
		webgpuSupported = detectWebGPU();
		if (!webgpuSupported) {
			error = 'このブラウザは WebGPU に未対応です。Chrome / Edge デスクトップ版でお試しください。';
			return;
		}
		installWebGPUAdapterFallback();
		void verifyWebGPUAdapter().then((supported) => {
			webgpuSupported = supported;
			if (!supported) {
				error =
					'WebGPU adapter を取得できませんでした。ブラウザのハードウェアアクセラレーション、GPUドライバ、chrome://gpu の WebGPU 状態を確認してください。';
			}
		});
	});
</script>

<svelte:head>
	<title>zeriyaGPT</title>
	<meta name="description" content="ブラウザ内で動くサイゼリヤ提案 AI (WebGPU)" />
</svelte:head>

<div class="zg-app">
	<header class="zg-header">
		<a href={sessionHref} class="zg-back" aria-label="戻る">
			<span class="i-tabler-arrow-left"></span>
		</a>
		<div class="zg-title">
			<strong>zeriyaGPT</strong>
			<small>WebGPU で動くブラウザ完結型アシスタント</small>
		</div>
		<button
			class="zg-icon-button"
			type="button"
			onclick={resetChat}
			disabled={generating || messages.length === 0}
			aria-label="会話をリセット"
		>
			<span class="i-tabler-refresh"></span>
		</button>
	</header>

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

</style>

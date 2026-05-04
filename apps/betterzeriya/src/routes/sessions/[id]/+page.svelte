<script lang="ts">
	import { goto } from '$app/navigation';
	import defaultMenuData from '$lib/assets/data/menu.json';
	import { filterMenuForServicePeriod, getMenuServicePeriod } from '$lib/menu-availability';
	import mockMenuData from '$server-mock/menu.json';
	import { matchesMenuSearch } from '$lib/menu-search';
	import { onMount } from 'svelte';

	type MenuItem = {
		code: string;
		name: string;
		kana: string;
		price: number;
		category: string;
		tags: string[];
		imageUrl: string | null;
		source?: 'official' | 'seed';
	};

	type CartItem = {
		id: string;
		name?: string;
		price?: number;
		count: number;
	};

	type AccountLine = {
		name: string;
		count: number;
		price: number;
	};

	type AccountSummary = {
		lines: AccountLine[];
		count: number;
		total: number;
	};

	type ClientState = {
		baseURL?: string;
		nextId: string;
		shopId: number;
		tableNo: number;
		peopleCount: number;
		pageKind: string;
		cart: CartItem[];
	};

	type OfficialSessionSnapshot = {
		id: string;
		state: ClientState & { baseURL: string };
		cookies: [string, string][];
		createdAt: number;
		updatedAt: number;
	};

	type CheckoutPresentation = {
		state: ClientState;
		account: AccountSummary;
		barcodeValue: string;
		barcodeImageSrc?: string;
		receiptShown: boolean;
	};

	type LookupItemResult = {
		result: string;
		item_data?: {
			id: string;
			name: string;
			price: number;
			state: number;
		};
	};

	type DefaultMenuEntry = {
		code: string;
		name: string;
		kana?: string;
		price?: number;
		category?: string;
		tags?: string[];
		imageUrl?: string | null;
	};

	type ActiveTab = 'add' | 'cart' | 'history' | 'call' | 'checkout';
	type MenuStatus = 'unchecked' | 'loading' | 'available' | 'unavailable' | 'error';

	const menuImageModules = import.meta.glob('../../../lib/assets/image/*.webp', {
		eager: true,
		query: '?url',
		import: 'default'
	}) as Record<string, string>;
	const menuCoverImages = Object.fromEntries(
		Object.entries(menuImageModules)
			.map(([file, source]) => [file.match(/\/([^/]+)\.webp$/)?.[1], source])
			.filter((entry): entry is [string, string] => Boolean(entry[0]))
	);

	const normalizeDefaultMenu = (entries: DefaultMenuEntry[]) =>
		entries
			.map((entry): MenuItem | null => {
				const code = String(entry.code ?? '').trim();
				const name = String(entry.name ?? '').trim();
				if (!/^\d{4}$/.test(code) || !name) {
					return null;
				}
				return {
					code,
					name,
					kana: entry.kana ?? name,
					price: Number(entry.price ?? 0),
					category: entry.category ?? 'メニュー',
					tags: entry.tags ?? [],
					imageUrl: entry.imageUrl ?? null,
					source: 'seed'
				};
			})
			.filter((item): item is MenuItem => item !== null);

	const defaultMenuItems = normalizeDefaultMenu(defaultMenuData as DefaultMenuEntry[]);

	type MockMenuEntry = { item_data: { id: string; state: number }; result: string };
	const mockStateMap: Map<string, number> = import.meta.env.DEV
		? new Map(
				(mockMenuData as MockMenuEntry[])
					.filter((entry) => entry.item_data?.id)
					.map((entry) => [entry.item_data.id, entry.item_data.state ?? 2])
			)
		: new Map();

	const initialMenuStatus = (code: string): MenuStatus => {
		if (!import.meta.env.DEV) return 'unchecked';
		const mockState = mockStateMap.get(code);
		if (mockState === undefined) return 'unchecked';
		return mockState === 0 ? 'unavailable' : 'available';
	};

	let { data } = $props<{ data: { sessionId: string } }>();

	const sessionId = $derived(data.sessionId);

	let clientState = $state<ClientState | null>(null);
	let officialSession = $state<OfficialSessionSnapshot | null>(null);
	let checkout = $state<CheckoutPresentation | null>(null);
	let menu = $state<MenuItem[]>(defaultMenuItems);
	let menuStatuses = $state<Record<string, MenuStatus>>(
		Object.fromEntries(defaultMenuItems.map((item) => [item.code, initialMenuStatus(item.code)]))
	);
	let menuDetectionSeq = $state<Record<string, number>>({});
	let currentMenuPeriod = $state(getMenuServicePeriod());
	let localCart = $state<CartItem[]>([]);
	let selectedCategory = $state('すべて');
	let search = $state('');
	let manualCode = $state('');
	let toast = $state('');
	let error = $state('');
	let busy = $state(false);
	let activeTab = $state<ActiveTab>('add');
	let gachaDialog: HTMLDialogElement | null = null;
	let gachaResults = $state<MenuItem[]>([]);
	let gachaBudget = $state(1000);

	const cartStorageKey = $derived(`betterzeriya:${sessionId}:cart`);
	const officialSessionStorageKey = $derived(`betterzeriya:${sessionId}:official-session`);
	const serviceMenu = $derived(filterMenuForServicePeriod(menu, currentMenuPeriod));
	const categories = $derived(['すべて', ...new Set(serviceMenu.map((item) => item.category))]);
	const filteredMenu = $derived(
		serviceMenu.filter((item) => {
			const categoryMatch = selectedCategory === 'すべて' || item.category === selectedCategory;
			const queryMatch = matchesMenuSearch(item, search);
			return categoryMatch && queryMatch;
		})
	);

	const totalCount = $derived(localCart.reduce((sum: number, item: CartItem) => sum + item.count, 0));
	const totalPrice = $derived(
		localCart.reduce((sum: number, item: CartItem) => sum + (item.price ?? 0) * item.count, 0)
	);
	const canOrder = $derived(Boolean(clientState && totalCount > 0 && !busy));
	const accountCount = $derived(checkout?.account.count ?? 0);
	const accountTotal = $derived(checkout?.account.total ?? 0);
	const tabItems = $derived([
		{ id: 'add' as const, label: '注文追加', icon: 'i-tabler-plus' },
		{ id: 'cart' as const, label: '注文かご', icon: 'i-tabler-shopping-cart', count: totalCount },
		{ id: 'history' as const, label: '注文履歴', icon: 'i-tabler-history' },
		{ id: 'call' as const, label: '店員呼出', icon: 'i-tabler-bell' },
		{ id: 'checkout' as const, label: '会計', icon: 'i-tabler-receipt' }
	]);

	const notify = (message: string) => {
		toast = message;
		window.setTimeout(() => {
			if (toast === message) {
				toast = '';
			}
		}, 2800);
	};

	const saveOfficialSession = (snapshot: OfficialSessionSnapshot) => {
		officialSession = snapshot;
		sessionStorage.setItem(officialSessionStorageKey, JSON.stringify(snapshot));
	};

	const restoreOfficialSession = () => {
		const raw = sessionStorage.getItem(officialSessionStorageKey);
		if (!raw) {
			return;
		}
		try {
			const parsed = JSON.parse(raw) as OfficialSessionSnapshot;
			if (parsed.id === sessionId && parsed.state?.baseURL && Array.isArray(parsed.cookies)) {
				officialSession = parsed;
			}
		} catch {
			sessionStorage.removeItem(officialSessionStorageKey);
		}
	};

	const statusLabel = (status: MenuStatus | undefined) => {
		if (status === 'available') {
			return '注文可';
		}
		if (status === 'unavailable') {
			return '注文不可';
		}
		if (status === 'error') {
			return '確認失敗';
		}
		if (status === 'loading') {
			return '確認中';
		}
		return '未確認';
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
			if (payload.officialSession) {
				saveOfficialSession(payload.officialSession as OfficialSessionSnapshot);
			}
			return payload as T;
		} catch (caught) {
			error = caught instanceof Error ? caught.message : '通信に失敗しました';
			throw caught;
		} finally {
			busy = false;
		}
	}

	const loadState = async () => {
		try {
			const result = await requestJSON<{ state: ClientState; officialSession: OfficialSessionSnapshot }>(
				`/api/sessions/${sessionId}`,
				{ officialSession }
			);
			clientState = result.state;
		} catch {}
	};

	const setMenuStatus = (code: string, status: MenuStatus, seq: number) => {
		if (menuDetectionSeq[code] !== seq) {
			return;
		}
		menuStatuses = { ...menuStatuses, [code]: status };
	};

	const nextMenuDetectionSeq = (code: string) => {
		const seq = (menuDetectionSeq[code] ?? 0) + 1;
		menuDetectionSeq = { ...menuDetectionSeq, [code]: seq };
		return seq;
	};

	const lookupOfficialMenuItem = async (code: string) => {
		const response = await fetch(`/api/sessions/${sessionId}/lookup`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ code, officialSession })
		});
		const result = (await response.json()) as LookupItemResult & {
			error?: string;
			officialSession?: OfficialSessionSnapshot;
		};
		if (!response.ok) {
			throw new Error(result.error ?? 'Request failed');
		}
		if (result.officialSession) {
			saveOfficialSession(result.officialSession as OfficialSessionSnapshot);
		}
		if (result.result !== 'OK' || !result.item_data || result.item_data.state === 0) {
			throw new Error(`メニュー番号 ${code} は利用できません`);
		}

		return {
			code,
			name: result.item_data.name,
			kana: result.item_data.name,
			price: result.item_data.price,
			category: menu.find((item) => item.code === code)?.category ?? '入力済み',
			tags: [...new Set([...(menu.find((item) => item.code === code)?.tags ?? []), '公式確認済み'])],
			imageUrl: menu.find((item) => item.code === code)?.imageUrl ?? null,
			source: 'official'
		} satisfies MenuItem;
	};

	const upsertMenuItem = (item: MenuItem) => {
		const existing = menu.find((entry) => entry.code === item.code);
		menu = existing
			? menu.map((entry) => (entry.code === item.code ? { ...entry, ...item } : entry))
			: [...menu, item];
	};

	const detectMenuItem = async (code: string, priority = false) => {
		const seq = nextMenuDetectionSeq(code);
		menuStatuses = { ...menuStatuses, [code]: 'loading' };
		try {
			const item = await lookupOfficialMenuItem(code);
			upsertMenuItem(item);
			setMenuStatus(code, 'available', seq);
			return item;
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : '通信に失敗しました';
			setMenuStatus(code, message.includes('利用できません') ? 'unavailable' : 'error', seq);
			if (priority) {
				if (message.includes('利用できません')) {
					notify(message);
				} else {
					error = message;
				}
			}
			throw caught;
		}
	};

	const saveCart = () => {
		if (localCart.length === 0) {
			sessionStorage.removeItem(cartStorageKey);
			return;
		}
		sessionStorage.setItem(cartStorageKey, JSON.stringify(localCart));
	};

	const commitCart = (nextCart: CartItem[]) => {
		localCart = nextCart;
		checkout = null;
		saveCart();
	};

	const restoreCart = () => {
		const rawCart = sessionStorage.getItem(cartStorageKey);
		if (!rawCart) {
			return;
		}

		try {
			const parsed = JSON.parse(rawCart);
			if (!Array.isArray(parsed)) {
				throw new Error('Invalid cart');
			}

			localCart = parsed
				.map((item) => {
					const id = String(item?.id ?? '').trim();
					const count = Number(item?.count ?? 1);
					const cartItem: CartItem = {
						id,
						name: item?.name ? String(item.name) : undefined,
						price: Number.isFinite(Number(item?.price)) ? Number(item.price) : 0,
						count
					};
					return cartItem;
				})
				.filter(
					(item) =>
						/^\d{4}$/.test(item.id) &&
						Number.isInteger(item.count) &&
						item.count > 0 &&
						item.count <= 99
				);
			saveCart();
		} catch {
			localCart = [];
			sessionStorage.removeItem(cartStorageKey);
		}
	};

	const addItem = async (item: MenuItem | string) => {
		try {
			const resolved = await detectMenuItem(typeof item === 'string' ? item : item.code, true);

			const current = localCart.find((cartItem) => cartItem.id === resolved.code);
			if (current?.count === 99) {
				error = '数量は 99 点までです';
				return;
			}

			commitCart(
				current
					? localCart.map((cartItem) =>
							cartItem.id === resolved.code
								? {
										...cartItem,
										name: resolved.name,
										price: resolved.price,
										count: cartItem.count + 1
									}
								: cartItem
						)
					: [
							...localCart,
							{ id: resolved.code, name: resolved.name, price: resolved.price, count: 1 }
						]
			);
			notify(`${resolved.name} をカートに入れました`);
		} catch {}
	};

	const addManualCode = async () => {
		const code = manualCode.trim();
		if (!/^\d{4}$/.test(code)) {
			error = '4 桁のメニュー番号を入力してください。';
			return;
		}
		try {
			await addItem(code);
			manualCode = '';
		} catch {}
	};

	const removeItem = (index: number, item: CartItem) => {
		commitCart(localCart.filter((_, itemIndex) => itemIndex !== index));
		notify(`${item.name ?? item.id} を削除しました`);
	};

	const updateItemCount = (index: number, item: CartItem, count: number) => {
		if (!Number.isInteger(count)) {
			return;
		}
		if (count <= 0) {
			removeItem(index, item);
			return;
		}
		if (count > 99) {
			error = '数量は 99 点までです';
			return;
		}

		commitCart(
			localCart.map((cartItem, itemIndex) =>
				itemIndex === index ? { ...cartItem, count } : cartItem
			)
		);
	};

	const submitOrder = async () => {
		if (!canOrder) {
			return;
		}
		try {
			const result = await requestJSON<{ state: ClientState }>(`/api/sessions/${sessionId}/submit`, {
				officialSession,
				cart: localCart.map((item) => ({ id: item.id, count: item.count }))
			});
			clientState = result.state;
			commitCart([]);
			activeTab = 'history';
			notify('注文を公式システムへ送信しました');
			await loadAccount();
		} catch {}
	};

	const loadAccount = async () => {
		try {
			const result = await requestJSON<CheckoutPresentation>(`/api/sessions/${sessionId}/account`, {
				officialSession
			});
			checkout = result;
			clientState = result.state;
			notify('注文履歴を更新しました');
		} catch {}
	};

	const settleCheckout = async () => {
		try {
			const result = await requestJSON<CheckoutPresentation>(`/api/sessions/${sessionId}/receipt`, {
				officialSession
			});
			checkout = result;
			clientState = result.state;
			notify('会計を確定しました');
		} catch {}
	};

	const callStaff = async (after = false) => {
		try {
			await requestJSON(`/api/sessions/${sessionId}/call`, { after, officialSession });
			notify(after ? 'デザート呼出を送信しました' : '店員呼出を送信しました');
		} catch {}
	};

	const runGacha = (budget = gachaBudget) => {
		const candidates = serviceMenu.filter(
			(item) => item.price > 0 && item.price <= budget && menuStatuses[item.code] !== 'unavailable'
		);
		// Fisher-Yates shuffle
		const shuffled = [...candidates];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		const picked: MenuItem[] = [];
		let remaining = budget;
		for (const item of shuffled) {
			if (item.price <= remaining) {
				picked.push(item);
				remaining -= item.price;
			}
		}
		gachaResults = picked;
		gachaDialog?.showModal();
	};

	const addGachaToCart = async () => {
		gachaDialog?.close();
		for (const item of gachaResults) {
			await addItem(item);
		}
	};

	onMount(() => {
		restoreOfficialSession();
		restoreCart();
		void loadState();
		const periodTimer = window.setInterval(() => {
			currentMenuPeriod = getMenuServicePeriod();
			if (!categories.includes(selectedCategory)) {
				selectedCategory = 'すべて';
			}
		}, 60_000);
		return () => window.clearInterval(periodTimer);
	});
</script>

<svelte:head>
	<title>注文 | Betterzeriya</title>
</svelte:head>

<main class="shell">
	<header class="session-header">
		<div>
			<p class="eyebrow">Order</p>
			<h1>注文</h1>
		</div>
		{#if clientState}
			<div class="table-chip">
				<span>Shop {clientState.shopId}</span>
				<strong>Table {clientState.tableNo}</strong>
				<span>{clientState.peopleCount} 名</span>
			</div>
		{/if}
		<div class="header-actions">
			<button class="secondary" onclick={loadState} disabled={busy}>更新</button>
			<button class="secondary" onclick={() => goto('/')}>QR</button>
		</div>
	</header>

	{#if error}
		<div class="alert" role="alert">{error}</div>
	{/if}
	{#if toast}
		<div class="toast" role="status">{toast}</div>
	{/if}

	<section class="tab-workspace">
		{#if activeTab === 'add'}
			<div class="menu-area">
				<div class="toolbar">
					<div>
						<p class="eyebrow">Add</p>
						<h2>注文追加</h2>
					</div>
					<div class="toolbar-actions">
						<button class="secondary" onclick={() => runGacha()} disabled={busy || !clientState}>
							<span class="i-tabler-dice-3"></span>
							ガチャ
						</button>
						<label class="search">
							<span>検索</span>
							<input bind:value={search} placeholder="メニューを検索" />
						</label>
					</div>
				</div>

				<div class="segments" aria-label="カテゴリ">
					{#each categories as category}
						<button
							class:selected={selectedCategory === category}
							onclick={() => (selectedCategory = category)}
						>
							{category}
						</button>
					{/each}
				</div>

				<div class="manual-add">
					<input
						bind:value={manualCode}
						placeholder="4 桁番号"
						inputmode="numeric"
						maxlength="4"
						onkeydown={(event) => event.key === 'Enter' && addManualCode()}
					/>
					<button class="secondary" onclick={addManualCode} disabled={busy || !clientState}>番号で追加</button>
				</div>
				<p class="menu-image-note">AIで生成された画像です。この画像は実際の商品と異なる可能性があります。</p>

				{#if filteredMenu.length}
					<div class="menu-grid">
						{#each filteredMenu as item}
							{@const coverImage = menuCoverImages[item.code] ?? item.imageUrl}
							<button
								class="menu-card"
								onclick={() => addItem(item)}
								disabled={busy || !clientState}
							>
								{#if coverImage}
									<img class="menu-card-cover" src={coverImage} alt="" loading="lazy" />
								{:else}
									<div class="menu-card-cover menu-card-fallback" aria-hidden="true">
										<span>{item.category.slice(0, 2)}</span>
									</div>
								{/if}
								<div class="menu-card-content">
									<strong>{item.name}</strong>
									<div class="menu-card-meta">
										<span
											class="menu-status"
											class:status-loading={menuStatuses[item.code] === 'loading'}
											class:status-available={menuStatuses[item.code] === 'available'}
											class:status-unavailable={menuStatuses[item.code] === 'unavailable'}
											class:status-error={menuStatuses[item.code] === 'error'}
										>
											{statusLabel(menuStatuses[item.code])}
										</span>
										<small class="price">¥{item.price.toLocaleString()}</small>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="empty">
						<strong>表示できるメニューがありません</strong>
						<span>検索条件を変えるか、4 桁番号で追加してください。</span>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'cart'}
			<div class="cart-panel">
				<div class="cart-head">
					<div>
						<p class="eyebrow">Cart</p>
						<h2>注文かご</h2>
					</div>
					<strong>{totalCount} 点</strong>
				</div>

				{#if localCart.length}
					<div class="cart-list">
						{#each localCart as item, index}
							<div class="cart-row">
								<div>
									<strong>{item.name ?? item.id}</strong>
									<span>{item.id}</span>
								</div>
								<div class="quantity-stepper" aria-label={`${item.name ?? item.id} の数量`}>
									<button
										aria-label="数量を減らす"
										onclick={() => updateItemCount(index, item, item.count - 1)}
										disabled={busy}
									>
										-
									</button>
									<input
										aria-label="数量"
										value={item.count}
										inputmode="numeric"
										onchange={(event) =>
											updateItemCount(
												index,
												item,
												Number((event.currentTarget as HTMLInputElement).value)
											)}
									/>
									<button
										aria-label="数量を増やす"
										onclick={() => updateItemCount(index, item, item.count + 1)}
										disabled={busy || item.count >= 99}
									>
										+
									</button>
								</div>
								<span>¥{((item.price ?? 0) * item.count).toLocaleString()}</span>
								<button
									class="icon-button danger"
									aria-label={`${item.name ?? item.id} を削除`}
									onclick={() => removeItem(index, item)}
									disabled={busy}
								>
									<span class="i-tabler-trash"></span>
								</button>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty">
						<strong>まだ空です</strong>
						<span>注文追加タブから 4 桁番号を入力して追加できます。</span>
					</div>
				{/if}

				<div class="total">
					<span>合計</span>
					<strong>¥{totalPrice.toLocaleString()}</strong>
				</div>

				<div class="cart-actions">
					<button class="secondary" onclick={() => (activeTab = 'add')}>注文追加</button>
					<button class="primary" onclick={submitOrder} disabled={!canOrder}>注文送信</button>
				</div>
			</div>
		{:else if activeTab === 'history'}
			<div class="tab-panel">
				<div class="checkout-head">
					<div>
						<p class="eyebrow">History</p>
						<h2>注文履歴</h2>
					</div>
					<strong>¥{accountTotal.toLocaleString()}</strong>
				</div>

				<div class="cart-actions">
					<button class="secondary" onclick={loadAccount} disabled={busy || !clientState}>履歴を更新</button>
				</div>

				{#if checkout && accountCount > 0}
					<div class="account-list">
						{#each checkout.account.lines as line}
							<div class="account-row">
								<span>{line.name}</span>
								<span>{line.count}</span>
								<strong>¥{line.price.toLocaleString()}</strong>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty compact">
						<strong>注文履歴はまだありません</strong>
						<span>注文送信後にここへ反映されます。</span>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'call'}
			<div class="tab-panel action-panel">
				<div>
					<p class="eyebrow">Call</p>
					<h2>店員呼び出し</h2>
				</div>
				<button class="primary call-button" onclick={() => callStaff()} disabled={busy || !clientState}>
					<span class="i-tabler-bell"></span>
					店員を呼ぶ
				</button>
				<button class="secondary call-button" onclick={() => callStaff(true)} disabled={busy || !clientState}>
					<span class="i-tabler-ice-cream-2"></span>
					デザートを持ってきてもらう
				</button>
			</div>
		{:else}
			<div class="tab-panel">
				<div class="checkout-head">
					<div>
						<p class="eyebrow">Checkout</p>
						<h2>会計</h2>
					</div>
					<strong>¥{accountTotal.toLocaleString()}</strong>
				</div>

				{#if checkout?.receiptShown}
					<div class="receipt-ticket" aria-live="polite">
						<div>
							<span>Table {clientState?.tableNo}</span>
							<strong>{checkout.barcodeValue}</strong>
						</div>
						{#if checkout.barcodeImageSrc}
							<img
								class="receipt-barcode"
								src={checkout.barcodeImageSrc}
								alt={`会計バーコード ${checkout.barcodeValue}`}
							/>
						{/if}
						<p>この画面をレジで提示してください。</p>
					</div>
				{:else}
					<div class="cart-actions">
						<button class="secondary" onclick={loadAccount} disabled={busy || !clientState}>
							明細を更新
						</button>
						<button
							class="primary"
							onclick={settleCheckout}
							disabled={busy || !clientState || accountCount === 0}
						>
							お会計する
						</button>
					</div>
				{/if}

				{#if checkout && accountCount > 0}
					<div class="account-list checkout-lines">
						{#each checkout.account.lines as line}
							<div class="account-row">
								<span>{line.name}</span>
								<span>{line.count}</span>
								<strong>¥{line.price.toLocaleString()}</strong>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty compact">
						<strong>会計できる注文がありません</strong>
						<span>注文を送信すると、ここで明細確認と会計確定ができます。</span>
					</div>
				{/if}

				<div class="total checkout-total">
					<span>{accountCount} 点</span>
					<strong>¥{accountTotal.toLocaleString()}</strong>
				</div>
			</div>
		{/if}
	</section>

	<nav class="bottom-tabs" aria-label="注文ナビゲーション">
		{#each tabItems as tab}
			<button class:active={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
				<span class={tab.icon} aria-hidden="true"></span>
				<span>{tab.label}</span>
				{#if tab.id === 'cart' && tab.count && tab.count > 0}
					<strong>{tab.count > 99 ? '99+' : tab.count}</strong>
				{/if}
			</button>
		{/each}
	</nav>
</main>

<dialog bind:this={gachaDialog} class="app-dialog">
	<form method="dialog" class="dialog-body" onsubmit={(event) => event.preventDefault()}>
		<p class="eyebrow">Gacha</p>
		<h2>1000円ガチャ結果</h2>
		<label class="gacha-budget-label">
			<span>予算 (円)</span>
			<input bind:value={gachaBudget} type="number" min="100" max="9999" step="100" />
		</label>
		{#if gachaResults.length}
			<div class="gacha-list">
				{#each gachaResults as item}
					<div class="gacha-row">
						<span>{item.name}</span>
						<strong>¥{item.price.toLocaleString()}</strong>
					</div>
				{/each}
			</div>
			<div class="gacha-total">
				<span>合計</span>
				<strong>¥{gachaResults.reduce((sum, item) => sum + item.price, 0).toLocaleString()}</strong>
			</div>
		{:else}
			<p class="gacha-empty">予算内で組み合わせられるメニューがありません。</p>
		{/if}
		<div class="dialog-actions three">
			<button class="secondary" type="button" onclick={() => gachaDialog?.close()}>閉じる</button>
			<button class="secondary" type="button" onclick={() => runGacha()}>もう一度</button>
			{#if gachaResults.length}
				<button class="primary" type="button" onclick={addGachaToCart} disabled={busy || !clientState}>
					カートに追加
				</button>
			{/if}
		</div>
	</form>
</dialog>

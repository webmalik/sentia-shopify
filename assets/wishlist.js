// Налаштування
const LOCAL_KEY = 'wm_wishlist_ids';
const SERVER_URL = 'https://wishlist-sentia.onrender.com';
const SHOP = 'sentia-dev.myshopify.com';
let container;

document.addEventListener('DOMContentLoaded', () => {
    initWishlist();
    // Змінити селектор на ваш контейнер вішліста
    container = document.querySelector('.mysaveditems__items');
    if (container) {
        renderWishlist();
    }
});

function getLocalWishlist() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch {
        return [];
    }
}

function setLocalWishlist(ids = []) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
}

function addToWishlist(productId) {
    const list = getLocalWishlist();
    if (!list.includes(productId)) {
        list.push(productId);
        setLocalWishlist(list);
    }
}

function removeFromWishlist(productId) {
    const list = getLocalWishlist().filter((id) => id !== productId);
    setLocalWishlist(list);
    syncWishlistAction(productId, 'remove');
}

function isInWishlist(productId) {
    return getLocalWishlist().includes(productId);
}

async function toggleWishlist(productId, el = null) {
    const isWishlisted = isInWishlist(productId);

    if (isWishlisted) {
        removeFromWishlist(productId);
        syncWishlistAction(productId, 'remove');
    } else {
        addToWishlist(productId);
        syncWishlistAction(productId, 'add');
    }

    // Оновити клас кнопки, якщо елемент передано
    if (el) {
        el.classList.toggle('active', !isWishlisted);
    }

    // Якщо ми на сторінці wishlist — перерендерити
    if (container) {
        renderWishlist();
    }
}

function updateWishlistState() {
    const current = getLocalWishlist();
    document.querySelectorAll('.wishlist-button[data-id]').forEach((el) => {
        const id = parseInt(el.dataset.id, 10);
        el.classList.toggle('active', current.includes(id));
    });
}

async function fullWishlistSyncAfterLogin() {
    const customer = getLoggedInCustomerId();
    if (!customer) return;

    // 1. Отримати локальний вішліст
    const localList = getLocalWishlist();

    // 2. Отримати серверний вішліст
    let serverList = [];
    try {
        const url = `${SERVER_URL}/wishlist-update/get?shop=${SHOP}&customerId=${customer}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data?.success && Array.isArray(data.wishlist)) {
            serverList = data.wishlist;
        }
    } catch (err) {
        console.error('Failed to fetch server wishlist:', err);
    }

    // 3. Об’єднати без дублів
    const combined = Array.from(new Set([...localList, ...serverList]));

    // 4. Зберегти об'єднаний список локально
    setLocalWishlist(combined);
    updateWishlistState();

    // 5. Відправити всі ID на сервер
    for (const id of combined) {
        await syncWishlistAction(id, 'add');
    }

    console.log('✅ Wishlist повністю синхронізовано');
}

function bindWishlistClickEvents() {
    document.querySelectorAll('.wishlist-button[data-id]').forEach((el) => {
        if (!el.dataset.wishlistBound) {
            el.dataset.wishlistBound = 'true';
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const id = parseInt(el.dataset.id, 10);
                toggleWishlist(id, el);
            });
        }
    });
}

function observeWishlistElements() {
    const observer = new MutationObserver(() => {
        bindWishlistClickEvents();
        updateWishlistState();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function getLoggedInCustomerId() {
    try {
        return window?.customer || null;
    } catch {
        return null;
    }
}

async function syncWishlistAction(productId, action = 'add') {
    const customerId = getLoggedInCustomerId();
    if (!customerId) return;
    const url = `${SERVER_URL}/wishlist-update?shop=${SHOP}&customerId=${customerId}&productId=${productId}&action=${action}`;
    try {
        await fetch(url);
    } catch (e) {
        console.error('Wishlist sync error:', e);
    }
}

async function loadServerWishlistIfNeeded() {
    const customerId = getLoggedInCustomerId();
    if (!customerId) return;

    const localList = getLocalWishlist();
    if (localList.length > 0) return;
    const url = `${SERVER_URL}/wishlist-update/get?shop=${SHOP}&customerId=${customerId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.success && Array.isArray(data.wishlist)) {
        setLocalWishlist(data.wishlist);
        updateWishlistState();
    }
}

function initWishlist() {
    bindWishlistClickEvents();
    observeWishlistElements();
    updateWishlistState();

    if (window.customer) {
        fullWishlistSyncAfterLogin();
        loadServerWishlistIfNeeded();
    }
}

function formatPrice(amount) {
    const currency = window.Shopify?.currency?.active || window.shopCurrency || 'USD';
    const shopLocale = document.documentElement.lang || 'en-US';
    return new Intl.NumberFormat(shopLocale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(+amount);
}

function renderWishlistCard(product) {
    const url = product?.url || (product?.handle ? `/products/${product.handle}` : '#');
    const img = product?.images?.[0]?.src || window.placeholderImage || '';
    const rawPrice = (product?.variants && product.variants[0]?.price) ?? product?.price ?? 0;
    const price = typeof formatPrice === 'function' ? formatPrice(rawPrice) : `${rawPrice}`;

    return `
    <div class="item-mysaveditems__item" data-fls-card data-id="${product.id}">
      <div class="item-mysaveditems__top">
        <button type="button"
                class="item-mysaveditems__heart wishlist-button --icon-heart-hover --icon-heart-animation"
                data-id="${product.id}"
                aria-label="Toggle wishlist"></button>
        <a href="${url}" class="item-mysaveditems__link">
          <img class="item-mysaveditems__image ibg ibg--contain"
               src="${img}"
               alt="${product.title}">
        </a>
      </div>
      <div class="item-mysaveditems__bottom">
        <h2 class="item-mysaveditems__headline">
          <a href="${url}">${product.title}</a>
        </h2>
        <div class="item-mysaveditems__price">${price}</div>
      </div>
    </div>
  `;
}

async function fetchAllProducts() {
    let allProducts = [];
    let page = 1;
    let keepFetching = true;

    while (keepFetching) {
        const locale = document.documentElement.lang || 'en';
        const url =
            locale === 'en'
                ? `/products.json?limit=50&page=${page}`
                : `/${locale}/products.json?limit=50&page=${page}`;

        const res = await fetch(url);
        const data = await res.json();

        if (Array.isArray(data.products) && data.products.length) {
            allProducts = allProducts.concat(data.products);
            page++;
        } else {
            keepFetching = false;
        }
    }

    return allProducts;
}

async function renderWishlist() {
    if (!container) return;

    const ids = getLocalWishlist().map(Number);
    if (!ids.length) {
        container.innerHTML = '<p class="empty-message">Your wishlist is empty</p>';
        return;
    }

    try {
        const allProducts = await fetchAllProducts();
        const wishlistProducts = allProducts.filter((p) => ids.includes(p.id));

        if (!wishlistProducts.length) {
            container.innerHTML = '<p class="empty-message">Your wishlist is empty</p>';
            return;
        }

        const html = wishlistProducts.map(renderWishlistCard).join('');
        container.innerHTML = html;

        updateWishlistState();
        bindWishlistClickEvents();
    } catch (error) {
        console.error('Wishlist load error:', error);
        container.innerHTML = '<p class="error-message">Failed to load wishlist items.</p>';
    }
}

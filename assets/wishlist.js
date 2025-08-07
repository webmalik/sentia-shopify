// Налаштування
const LOCAL_KEY = 'wm_wishlist_ids';
const SERVER_URL = 'https://wishlistapp-frooteli.onrender.com';
const SHOP = 'frooteli-dev.myshopify.com';
let container;

document.addEventListener('DOMContentLoaded', () => {
    initWishlist();
    // Змінити селектор на ваш контейнер вішліста
    container = document.querySelector('.account__content-wishlist');
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
    const price = formatPrice(product.variants[0].price);
    return `
    <div class="card" data-fls-card>
      <div class="card__wrapper">
        <div class="card__top">
          <div class="card__labels">
            ${
                product.tags?.length
                    ? product.tags.map((tag) => `<div class="card__label">${tag}</div>`).join('')
                    : ''
            }
          </div>
          <div class="card__wishlist wishlist-button" data-id="${product.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9.00859 18.8062L9.40256 18.3065L9.00859 18.8062ZM12.0008 5.59914L11.5423 6.04044C11.6623 6.16508 11.8278 6.2355 12.0008 6.2355C12.1738 6.2355 12.3394 6.16508 12.4593 6.04044L12.0008 5.59914ZM14.9931 18.8062L15.387 19.306L14.9931 18.8062ZM9.00859 18.8062L9.40256 18.3065C7.91594 17.1345 6.27239 15.9771 4.96964 14.5101C3.68871 13.0678 2.78871 11.3765 2.78871 9.18051H2.15234H1.51598C1.51598 11.7737 2.59525 13.7532 4.01801 15.3553C5.41895 16.9328 7.20353 18.1936 8.61463 19.306L9.00859 18.8062ZM2.15234 9.18051H2.78871C2.78871 7.02397 4.00743 5.2102 5.67927 4.446C7.31099 3.70013 9.48937 3.90748 11.5423 6.04044L12.0008 5.59914L12.4593 5.15784C10.0796 2.68647 7.33477 2.28987 5.14918 3.28846C3.00469 4.26872 1.51598 6.5478 1.51598 9.18051H2.15234ZM9.00859 18.8062L8.61463 19.306C9.11907 19.7044 9.65513 20.1239 10.1968 20.4404C10.7383 20.7568 11.3459 21.0076 12.0008 21.0076V20.3712V19.7349C11.669 19.7349 11.2917 19.6062 10.8389 19.3416C10.3863 19.0771 9.9187 18.7141 9.40158 18.3065L9.00859 18.8062ZM14.9931 18.8062L15.387 19.306C16.7972 18.1936 18.5817 16.9328 19.9827 15.3553C21.4054 13.7532 22.4847 11.7737 22.4847 9.18051H21.8483H21.212C21.212 11.3765 20.312 13.0678 19.031 14.5101C17.7283 15.9771 16.0847 17.1345 14.5981 18.3065L14.9931 18.8062ZM21.8483 9.18051H22.4847C22.4847 6.5478 20.995 4.26872 18.8505 3.28846C16.6659 2.28987 13.9201 2.68647 11.5414 5.15784L12.0008 5.59914L12.4583 6.04044C14.5113 3.90748 16.6897 3.70013 18.3214 4.446C19.9932 5.2102 21.212 7.02397 21.212 9.18051H21.8483ZM14.9931 18.8062L14.5981 18.3065C14.081 18.7141 13.6134 19.0771 13.1608 19.3416C12.708 19.6062 12.3307 19.7349 12.0008 19.7349V20.3712V21.0076C12.6538 21.0076 13.2614 20.7568 13.8029 20.4404C14.3446 20.1239 14.8806 19.7044 15.386 19.306L14.9931 18.8062Z" fill="#121212"></path>
              <path class="svg-fill" d="M2.15137 9.18051C2.15137 13.9698 6.10989 16.5219 9.00762 18.8062C10.0302 19.6123 11.015 20.3712 11.9999 20.3712C12.9847 20.3712 13.9695 19.6123 14.9921 18.8062C17.8898 16.5219 21.8483 13.9698 21.8483 9.18051C21.8483 4.39125 16.4315 0.994808 11.9999 5.59914C7.56819 0.994808 2.15137 4.39125 2.15137 9.18051Z" fill="#121212"></path>
              <path class="svg-fill" d="M9.00762 18.8062L9.40158 18.3064L9.00762 18.8062ZM11.9999 5.59914L11.5414 6.04044C11.6613 6.16508 11.8269 6.23551 11.9999 6.23551C12.1728 6.2355 12.3384 6.16508 12.4583 6.04044L11.9999 5.59914ZM14.9921 18.8062L14.5981 18.3064L14.9921 18.8062ZM9.00762 18.8062L9.40158 18.3064C7.91496 17.1345 6.27141 15.9771 4.96866 14.5101C3.68773 13.0678 2.78773 11.3765 2.78773 9.18051H2.15137H1.515C1.515 11.7737 2.59427 13.7532 4.01703 15.3553C5.41797 16.9328 7.20255 18.1936 8.61366 19.306L9.00762 18.8062ZM2.15137 9.18051H2.78773C2.78773 7.02397 4.00646 5.2102 5.67829 4.446C7.31001 3.70013 9.48839 3.90748 11.5414 6.04044L11.9999 5.59914L12.4583 5.15784C10.0796 2.68647 7.33379 2.28987 5.14918 3.28846C3.00469 4.26872 1.515 6.5478 1.515 9.18051H2.15137ZM9.00762 18.8062L8.61366 19.306C9.11907 19.7044 9.65513 20.1239 10.1968 20.4404C10.7383 20.7568 11.3459 21.0076 11.9999 21.0076V20.3712V19.7349C11.669 19.7349 11.2917 19.6062 10.8389 19.3416C10.3863 19.0771 9.9187 18.7141 9.40158 18.3064L9.00762 18.8062ZM14.9921 18.8062L15.386 19.306C16.7972 18.1936 18.5817 16.9328 19.9827 15.3553C21.4054 13.7532 22.4847 11.7737 22.4847 9.18051H21.8483H21.212C21.212 11.3765 20.312 13.0678 19.031 14.5101C17.7283 15.9771 16.0847 17.1345 14.5981 18.3064L14.9921 18.8062ZM21.8483 9.18051H22.4847C22.4847 6.5478 20.995 4.26872 18.8505 3.28846C16.6659 2.28987 13.9201 2.68647 11.5414 5.15784L11.9999 5.59914L12.4583 6.04044C14.5113 3.90748 16.6897 3.70013 18.3214 4.446C19.9932 5.2102 21.212 7.02397 21.212 9.18051H21.8483ZM14.9921 18.8062L14.5981 18.3064C14.081 18.7141 13.6134 19.0771 13.1608 19.3416C12.708 19.6062 12.3307 19.7349 11.9999 19.7349V20.3712V21.0076C12.6538 21.0076 13.2614 20.7568 13.8029 20.4404C14.3446 20.1239 14.8806 19.7044 15.386 19.306L14.9921 18.8062Z" fill="#121212"></path>
            </svg>
          </div>
        </div>
        <div class="card__image">
          <img src="${product.images[0].src}" alt="${product.title}">
          <a href="#" class="card__button">${window.add_to_cart}</a>
        </div>
        <div class="card__bottom">
          <div class="card__title">${product.title}</div>
          <div class="card__price">${price}</div>
        </div>
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

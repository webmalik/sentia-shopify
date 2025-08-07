document.addEventListener('DOMContentLoaded', () => {
    const cartContainer = document.querySelector('#fls-cart-items');
    const subtotalElement = document.querySelector('.cart__subtotal-price');
    const template = document.querySelector('#cart-item-template');

    if (!cartContainer || !template) return;

    const templateHTML = template.innerHTML.trim();
    const shopLocale = document.documentElement.lang || 'en-US';
    const currency = window.Shopify?.currency?.active || 'USD';

    const formatPrice = (amount) =>
        new Intl.NumberFormat(shopLocale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount / 100);

    const createCartItem = ({ key, product_title, image, quantity, line_price }) => {
        const safeQty = Math.max(1, parseInt(quantity) || 1);
        const imgSrc =
            typeof image === 'string'
                ? image
                : image?.src || 'https://cdn.shopify.com/s/files/1/0000/0001/files/no-image.jpg';

        const html = templateHTML
            .replaceAll('[[key]]', key || '')
            .replaceAll('[[title]]', product_title || 'Untitled')
            .replaceAll('[[price]]', formatPrice(line_price || 0))
            .replaceAll('[[quantity]]', safeQty);

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        const itemNode = wrapper.firstElementChild;

        const img = itemNode.querySelector('[data-cart-img]');
        if (img) img.setAttribute('src', imgSrc);

        return itemNode;
    };

    const renderCart = async () => {
        try {
            const res = await fetch('/cart.js');
            if (!res.ok) throw new Error(`Cart fetch failed: ${res.status}`);
            const cart = await res.json();

            cartContainer.innerHTML = '';

            if (!Array.isArray(cart.items) || cart.items.length === 0) {
                cartContainer.innerHTML = '<div class="cart__empty">Your cart is empty</div>';
                subtotalElement.textContent = formatPrice(0);
                return;
            }

            cart.items.forEach((item) => {
                const card = createCartItem(item);
                cartContainer.appendChild(card);
            });

            subtotalElement.textContent = formatPrice(cart.total_price || 0);
            bindCartEvents();
        } catch (err) {
            console.error('Cart render error:', err);
        }
    };

    const changeItemQty = async (key, quantity) => {
        const safeQty = Number.isInteger(quantity) ? quantity : parseInt(quantity);
        if (!key || isNaN(safeQty) || safeQty < 0 || safeQty > 999) return;

        try {
            const res = await fetch('/cart/change.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: key, quantity: safeQty }),
            });

            if (res.status === 429) {
                alert('Too many requests. Please wait.');
                return;
            }

            const data = await res.json();

            if (res.status === 422 || !data) {
                alert('Item not available or sold out.');
                return;
            }

            renderCart();
        } catch (err) {
            console.error('Qty update error:', err);
        }
    };

    const bindCartEvents = () => {
        cartContainer.querySelectorAll('.cart__item').forEach((item) => {
            const key = item.dataset.cartKey;
            const input = item.querySelector('input');
            const minus = item.querySelector('[data-cart-minus]');
            const plus = item.querySelector('[data-cart-plus]');
            const remove = item.querySelector('[data-cart-remove]');

            if (!key || !input) return;

            plus?.addEventListener('click', () => {
                let qty = parseInt(input.value) || 1;
                qty = Math.min(999, qty + 1);
                changeItemQty(key, qty);
            });

            minus?.addEventListener('click', () => {
                let qty = parseInt(input.value) || 1;
                if (qty > 1) {
                    changeItemQty(key, qty - 1);
                } else {
                    changeItemQty(key, 0);
                }
            });

            input?.addEventListener('change', () => {
                let val = parseInt(input.value);
                if (isNaN(val) || val <= 0) val = 1;
                if (val > 999) val = 999;
                input.value = val;
                changeItemQty(key, val);
            });

            remove?.addEventListener('click', () => {
                changeItemQty(key, 0);
            });
        });
    };

    document.addEventListener('cart:open', renderCart);
    window.addEventListener('cartToggled', (e) => {
        if (e.detail?.isOpen) renderCart();
    });

    renderCart();
});

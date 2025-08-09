document.addEventListener('DOMContentLoaded', () => {
    const DEBOUNCE_DELAY = 500;
    let isBusy = false;

    const form = document.querySelector('[data-product-form]');
    if (!form) return;

    const productJsonEl = document.querySelector(
        'script[type="application/json"][data-product-json]',
    );
    if (!productJsonEl) return;

    const cfgEl = document.querySelector('script[type="application/json"][data-product-config]');

    let product;
    try {
        product = JSON.parse(productJsonEl.textContent);
    } catch (e) {
        console.error('Product JSON parse error', e);
        return;
    }

    let moneyFormat = '${{amount}}';
    if (cfgEl) {
        try {
            const cfg = JSON.parse(cfgEl.textContent);
            if (cfg && cfg.moneyFormat) moneyFormat = cfg.moneyFormat;
        } catch (e) {
            /* no-op */
        }
    }

    const idInput = form.querySelector('[data-variant-id]');
    const addBtn = form.querySelector('[data-add-to-cart]');
    const priceWrap = document.querySelector('[data-product-price]');
    const priceCur = priceWrap ? priceWrap.querySelector('[data-price-current]') : null;
    const priceCmp = priceWrap ? priceWrap.querySelector('[data-price-compare]') : null;

    const optionInputs = form.querySelectorAll('.form-productpage__options-input');
    const mainImg = document.querySelector('[data-product-image]');

    const qtyInput = form.querySelector('[data-fls-quantity-value]');
    const minusBtn = form.querySelector('[data-fls-quantity-minus]');
    const plusBtn = form.querySelector('[data-fls-quantity-plus]');

    const formatMoney = (cents) => {
        if (window.Shopify && typeof Shopify.formatMoney === 'function') {
            return Shopify.formatMoney(cents, moneyFormat);
        }
        return (cents / 100).toFixed(2);
    };

    // Qty
    if (minusBtn && qtyInput) {
        minusBtn.addEventListener('click', () => {
            qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
        });
    }
    if (plusBtn && qtyInput) {
        plusBtn.addEventListener('click', () => {
            qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) + 1);
        });
    }

    // Variants
    const getSelectedOptions = () => {
        const opts = [];
        optionInputs.forEach((input) => {
            if (input.checked) {
                const idx = Number(input.dataset.optionIndex || 0);
                opts[idx] = input.value;
            }
        });
        return opts;
    };

    const findVariant = (opts) => {
        const variants = product?.variants || [];
        return variants.find((v) => v.options.every((val, i) => val === opts[i]));
    };

    const updatePrice = (variant) => {
        if (!priceCur) return;
        priceCur.innerHTML = formatMoney(variant.price);
        if (priceCmp) {
            if (variant.compare_at_price && variant.compare_at_price > variant.price) {
                priceCmp.style.display = '';
                priceCmp.innerHTML = formatMoney(variant.compare_at_price);
            } else {
                priceCmp.style.display = 'none';
                priceCmp.innerHTML = '';
            }
        }
    };

    const updateImage = (variant) => {
        if (!mainImg || !variant?.featured_image?.src) return;
        mainImg.src = variant.featured_image.src;
        mainImg.alt = variant.featured_image.alt || '';
    };

    const updateUI = (variant) => {
        if (!variant) {
            if (addBtn) addBtn.disabled = true;
            return;
        }
        if (idInput) idInput.value = variant.id;
        updatePrice(variant);
        if (addBtn) addBtn.disabled = !variant.available;
        updateImage(variant);
    };

    // init
    const initial =
        findVariant(getSelectedOptions()) ||
        (product.variants || []).find((v) => String(v.id) === String(idInput?.value));
    updateUI(initial);

    // option change
    optionInputs.forEach((input) => {
        input.addEventListener('change', () => {
            updateUI(findVariant(getSelectedOptions()));
        });
    });

    // AJAX add to cart
    const addToCart = async (variantId, quantity, button) => {
        if (isBusy) return;
        isBusy = true;
        if (button) {
            button.disabled = true;
            button.classList.add('loading');
        }

        try {
            const res = await fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ id: Number(variantId), quantity: Number(quantity) || 1 }),
            });
            if (!res.ok) throw new Error(`Add to cart error: ${res.status}`);
            const data = await res.json();

            window.flsCart?.open?.();
            document.dispatchEvent(new CustomEvent('cart:added', { detail: { product: data } }));
        } catch (err) {
            console.error('Add to cart failed:', err?.message || err);
        } finally {
            if (button) {
                button.disabled = false;
                button.classList.remove('loading');
            }
            setTimeout(() => {
                isBusy = false;
            }, DEBOUNCE_DELAY);
        }
    };

    // важливо: перехоплюємо submit, щоб НЕ було редіректа
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const variantId = idInput?.value;
        if (!variantId) return;
        const quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
        addToCart(variantId, quantity, addBtn);
    });
});

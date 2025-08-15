document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-edit-form]');
    if (!form || !window.customer) return;

    const SERVER_URL = 'https://wishlist-sentia.onrender.com';
    const SHOP = 'sentia-dev.myshopify.com';
    const CUSTOMER_ID = window.customer;

    const countrySelect = form.querySelector('select[name="country"]');
    const submitBtn = document.querySelector('[data-edit-submit]');

    const fillCountries = async () => {
        try {
            const res = await fetch('/meta.json');
            const meta = await res.json();
            const countries = meta?.country_option_tags || [];

            countries.forEach((c) => {
                const option = document.createElement('option');
                option.value = c.value;
                option.textContent = c.label;
                countrySelect.appendChild(option);
            });
        } catch (err) {
            console.error('[country-fill] Failed to load countries', err);
        }
    };

    const fillFormFields = (data) => {
        const inputs = form.querySelectorAll('input[name], select[name], textarea[name]');
        inputs.forEach((input) => {
            const name = input.name;
            if (!name) return;

            const source = data.default_address?.[name] ?? data[name];
            if (source !== undefined && source !== null) {
                if (input.tagName === 'SELECT') {
                    const option = Array.from(input.options).find(
                        (opt) =>
                            opt.value === source ||
                            opt.textContent.trim().toLowerCase() === source.trim().toLowerCase(),
                    );
                    if (option) input.value = option.value;
                } else {
                    input.value = source;
                }
            }
        });

        if (data.default_address?.id) {
            const addressIdInput = form.querySelector('[name="address_id"]');
            if (addressIdInput) addressIdInput.value = data.default_address.id;
        }
    };

    const getUserData = async () => {
        try {
            const res = await fetch(
                `${SERVER_URL}/user-update?shop=${SHOP}&customerId=${CUSTOMER_ID}`,
            );
            const json = await res.json();
            if (json?.customer) fillFormFields(json.customer);
        } catch (err) {
            console.error('[account-edit] Fetch error:', err);
        }
    };

    const collectFormData = () => {
        const data = {
            customerId: CUSTOMER_ID,
            shop: SHOP,
        };

        const fields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'company',
            'address1',
            'address2',
            'city',
            'country',
            'province',
            'zip',
            'address_id',
        ];

        fields.forEach((field) => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) data[field] = input.value.trim();
        });

        const defaultCheckbox = form.querySelector('[name="default"]');
        if (defaultCheckbox) data.default = defaultCheckbox.checked;

        return data;
    };

    const sendUserData = async () => {
        const payload = collectFormData();
        console.log('[account-edit] Sending:', payload);

        try {
            const res = await fetch(`${SERVER_URL}/user-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (json?.success) {
                const note = document.createElement('div');
                note.className = 'account__notice';
                note.textContent = window.update_customer || 'Customer updated successfully.';
                form.appendChild(note);
                setTimeout(() => note.remove(), 5000);
            } else {
                console.warn('[account-edit] Update failed:', json);
            }
        } catch (err) {
            console.error('[account-edit] Submit error:', err);
        }
    };

    if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sendUserData();
        });
    }

    fillCountries().then(getUserData);
});

document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.querySelector('#password');
    const toggleBtn = document.querySelector('.auth__eye');

    if (passwordInput && toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isVisible = passwordInput.type === 'text';
            passwordInput.type = isVisible ? 'password' : 'text';
            toggleBtn.classList.toggle('auth__eye--visible', !isVisible);
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.auth__form');
    const emailInput = document.querySelector('#email');
    const rememberCheckbox = document.querySelector('#remember');

    // 1. Заповнюємо email з localStorage
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }

    // 2. Зберігаємо при сабміті
    form?.addEventListener('submit', (e) => {
        if (rememberCheckbox.checked) {
            localStorage.setItem('rememberedEmail', emailInput.value.trim());
        } else {
            localStorage.removeItem('rememberedEmail');
        }
    });
});

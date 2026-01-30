const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

// Switch to Sign Up
registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

// Switch back to Login
loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

const loginForm = document.querySelector('.sign-in form');
const errorDiv = document.getElementById('login-error');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.textContent = "";
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                window.location.href = '/dashboard.html';
            } else {
                errorDiv.textContent = result.message;
                errorDiv.classList.add('shake');
                setTimeout(() => errorDiv.classList.remove('shake'), 500);
            }
        } catch (error) {
            errorDiv.textContent = "Something went wrong. Try again.";
        }
    });
}
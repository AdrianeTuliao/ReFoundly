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

// SIGN UP LOGIC
const signUpForm = document.querySelector('.sign-up form');
signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: signUpForm.querySelector('input[placeholder*="Full Name"]').value,
        username: signUpForm.querySelector('input[placeholder="Username"]').value,
        email: signUpForm.querySelector('input[placeholder="Email"]').value,
        password: signUpForm.querySelector('input[placeholder="Password"]').value,
        contact_number: signUpForm.querySelector('input[name="contact_number"]').value,
        dob: signUpForm.querySelector('input[name="dob"]').value
    };

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    alert(result.message);
    if (result.success) container.classList.remove("active"); // Switch to login
});

// LOGIN LOGIC (Update for MFA)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.mfaRequired) {
        const otp = prompt("Enter the 6-digit OTP sent to your email:");
        const verifyRes = await fetch('/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp })
        });
        const verifyResult = await verifyRes.json();
        if (verifyResult.success) window.location.href = '/dashboard.html';
        else alert("Invalid OTP");
    } else if (result.success) {
        window.location.href = '/dashboard.html';
    } else {
        errorDiv.textContent = result.message;
    }
});
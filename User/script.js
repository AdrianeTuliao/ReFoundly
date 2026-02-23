const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');
const loginForm = document.querySelector('.sign-in form');
const signUpForm = document.querySelector('.sign-up form');
const errorDiv = document.getElementById('login-error');

/* FORM SIDE TOGGLE */
function handleFormToggle() {
    registerBtn.addEventListener('click', () => container.classList.add("active"));
    loginBtn.addEventListener('click', () => container.classList.remove("active"));
}

/* UI ERROR DISPLAY */
function setFieldError(inputName, message, errorId) {
    const input = signUpForm.querySelector(`input[name="${inputName}"]`);
    const errorDisplay = document.getElementById(errorId);
    if (input) input.style.borderColor = "#d9534f"; 
    if (errorDisplay) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = "block";
    }
}

/* UI ERROR CLEAR */
function clearFieldError(inputName, errorId) {
    const input = signUpForm.querySelector(`input[name="${inputName}"]`);
    const errorDisplay = document.getElementById(errorId);
    if (input) input.style.borderColor = "#d1d1d1";
    if (errorDisplay) {
        errorDisplay.textContent = "";
        errorDisplay.style.display = "none";
    }
}

/* PASSWORD VISIBILITY TOGGLE */
function initializePasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(eye => {
        eye.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId) || this.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
}

const nameInput = signUpForm.querySelector('input[name="name"]');
const usernameInput = signUpForm.querySelector('input[name="username"]');
const emailInput = signUpForm.querySelector('input[name="email"]');
const contactInput = signUpForm.querySelector('input[name="contact_number"]');
const passwordInput = signUpForm.querySelector('input[name="password"]');
const confirmInput = signUpForm.querySelector('input[name="confirm_password"]');

/* FULL NAME VALIDATION */
function validateFullName() {
    nameInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[0-9]/g, '');
        const nameRegex = /^[a-zA-Z\s]+,\s[a-zA-Z\s]+$/;
        if (!nameRegex.test(e.target.value.trim())) {
            setFieldError('name', "Format: Lastname, Firstname", 'name-error');
        } else {
            clearFieldError('name', 'name-error');
        }
    });
}

/* USERNAME VALIDATION */
/* USERNAME VALIDATION */
function validateUsername() {
    usernameInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
        
        if (value.length > 20) value = value.slice(0, 20);
        e.target.value = value;

        if (value.length > 0 && value.length < 3) {
            setFieldError('username', "Username must be 3-20 characters", 'username-error');
        } else {
            clearFieldError('username', 'username-error');
        }
    });
}

/* EMAIL DOMAIN VALIDATION */
function validateEmail() {
    emailInput.addEventListener('input', (e) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|example\.com)$/;
        if (!emailRegex.test(e.target.value.trim())) {
            setFieldError('email', "Accepts @gmail.com or @example.com only", 'email-error');
        } else {
            clearFieldError('email', 'email-error');
        }
    });
}

/* CONTACT NUMBER VALIDATION */
function validateContactNumber() {
    contactInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        if (e.target.value.length > 0 && e.target.value.length < 11) {
            setFieldError('contact_number', "Must be exactly 11 digits", 'contact-error');
        } else {
            clearFieldError('contact_number', 'contact-error');
        }
    });
}

/* PASSWORD STRENGTH AND MATCH */
function validatePasswords() {
    passwordInput.addEventListener('input', (e) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(e.target.value)) {
            setFieldError('password', "Must be 8+ chars with a number & uppercase letter", 'password-error');
        } else {
            clearFieldError('password', 'password-error');
        }
        if (confirmInput.value) confirmInput.dispatchEvent(new Event('input'));
    });

    confirmInput.addEventListener('input', (e) => {
        if (e.target.value !== passwordInput.value) {
            setFieldError('confirm_password', "Passwords do not match!", 'confirm-error');
        } else {
            clearFieldError('confirm_password', 'confirm-error');
        }
    });
}

/* REGISTRATION FORM SUBMISSION */
function handleRegistrationSubmit() {
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameRegex = /^[a-zA-Z\s]+,\s[a-zA-Z\s]+$/;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|example\.com)$/;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        let isValid = true;
        if (!nameRegex.test(nameInput.value.trim())) isValid = false;
        if (!emailRegex.test(emailInput.value.trim())) isValid = false;
        if (!passwordRegex.test(passwordInput.value)) isValid = false;
        if (passwordInput.value !== confirmInput.value) isValid = false;
        if (contactInput.value.length !== 11) isValid = false;

        if (!isValid) {
            alert("Please fix the errors before signing up.");
            return;
        }

        const data = {
            name: nameInput.value.trim(),
            username: usernameInput.value,
            email: emailInput.value.trim(),
            password: passwordInput.value,
            contact_number: contactInput.value,
            dob: signUpForm.querySelector('input[name="dob"]').value
        };

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            alert(result.message);
            if (result.success) container.classList.remove("active"); 
        } catch (error) {
            alert("Registration failed. Server error.");
        }
    });
}

/* LOGIN FORM SUBMISSION */
function handleLoginSubmit() {
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.textContent = "";
            const formData = new FormData(loginForm);
            const loginData = Object.fromEntries(formData.entries());
            const userEmail = loginData.email.trim().toLowerCase();

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...loginData, email: userEmail })
                });
                const result = await response.json();

                if (result.mfaRequired) {
                    const otp = prompt("Enter the 6-digit OTP sent to your email:");
                    
                    if (otp === null) return; 

                    console.log("Sending for verification:", { email: userEmail, otp: otp.trim() });

                    const verifyRes = await fetch('/verify-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            email: userEmail, 
                            otp: otp.trim() 
                        })
                    });
                    
                    const verifyResult = await verifyRes.json();
                    if (verifyResult.success) {
                        window.location.href = '/dashboard.html';
                    } else {
                        alert("Invalid OTP: " + (verifyResult.message || "Please try again."));
                    }
                } else if (result.success) {
                    window.location.href = '/dashboard.html';
                } else {
                    errorDiv.textContent = result.message;
                    errorDiv.classList.add('shake');
                    setTimeout(() => errorDiv.classList.remove('shake'), 500);
                }
            } catch (error) {
                errorDiv.textContent = "Connection error. Try again.";
            }
        });
    }
}

/* INITIALIZE ALL SCRIPTS */
handleFormToggle();
initializePasswordToggles();
validateFullName();
validateUsername();
validateEmail();
validateContactNumber();
validatePasswords();
handleRegistrationSubmit();
handleLoginSubmit();
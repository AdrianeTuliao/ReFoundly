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

/* --- TOOLTIP SYSTEM --- */
function updateChecklist(input, requirements) {
    let tooltip = document.getElementById(`tooltip-${input.name}`);
    
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'input-tooltip-neat';
        tooltip.id = `tooltip-${input.name}`;
        document.body.appendChild(tooltip);
    }

    const allValid = requirements.every(req => req.isValid);

    if (!allValid && input.value.length > 0) {
        input.classList.add('input-invalid');
    } else {
        input.classList.remove('input-invalid');
    }

    const rect = input.getBoundingClientRect();
    tooltip.style.left = `${rect.right + window.scrollX + 15}px`;
    tooltip.style.top = `${rect.top + window.scrollY + (rect.height / 2)}px`;

    let html = '';
    requirements.forEach(req => {
        const icon = req.isValid ? 'fa-check-circle' : 'fa-circle';
        const color = req.isValid ? '#7aa340' : '#cbd5e0';
        html += `<div class="req-item" style="color: ${req.isValid ? '#444' : '#888'}">
                    <i class="fas ${icon}" style="color: ${color}; font-size: 10px;"></i>
                    <span>${req.text}</span>
                 </div>`;
    });
    tooltip.innerHTML = html;
}

function removeTooltip(inputName) {
    const tooltip = document.getElementById(`tooltip-${inputName}`);
    if (tooltip) tooltip.remove();
}

/* PASSWORD VISIBILITY TOGGLE */
function initializePasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(eye => {
        eye.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
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

/* VALIDATION WRAPPERS (UI ONLY) */
function validateFullName() {
    const check = () => {
        const val = nameInput.value.replace(/[0-9]/g, '');
        nameInput.value = val;
        updateChecklist(nameInput, [{ text: "Format: Lastname, Firstname", isValid: /^[a-zA-Z\s]+,\s[a-zA-Z\s]+$/.test(val.trim()) }]);
    };
    nameInput.addEventListener('input', check);
    nameInput.addEventListener('focus', check);
    nameInput.addEventListener('blur', () => removeTooltip('name'));
}

function validateUsername() {
    const check = () => {
        let value = usernameInput.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
        usernameInput.value = value;
        updateChecklist(usernameInput, [{ text: "3-20 characters", isValid: value.length >= 3 && value.length <= 20 }]);
    };
    usernameInput.addEventListener('input', check);
    usernameInput.addEventListener('focus', check);
    usernameInput.addEventListener('blur', () => removeTooltip('username'));
}

function validateEmail() {
    const check = () => {
        updateChecklist(emailInput, [{ text: "Use @gmail.com or @example.com", isValid: /^[a-zA-Z0-9._%+-]+@(gmail\.com|example\.com)$/.test(emailInput.value.trim()) }]);
    };
    emailInput.addEventListener('input', check);
    emailInput.addEventListener('focus', check);
    emailInput.addEventListener('blur', () => removeTooltip('email'));
}

function validateContactNumber() {
    const check = () => {
        contactInput.value = contactInput.value.replace(/\D/g, '');
        updateChecklist(contactInput, [{ text: "Exactly 11 digits", isValid: contactInput.value.length === 11 }]);
    };
    contactInput.addEventListener('input', check);
    contactInput.addEventListener('focus', check);
    contactInput.addEventListener('blur', () => removeTooltip('contact_number'));
}

function validatePasswords() {
    const check = () => {
        const val = passwordInput.value;
        updateChecklist(passwordInput, [
            { text: "At least 8 characters", isValid: val.length >= 8 },
            { text: "One uppercase & one number", isValid: /[A-Z]/.test(val) && /\d/.test(val) },
            { text: "At least 1 special character", isValid: /[!@#$%^&*(),.?":{}|<>]/.test(val) },
            { text: "No spaces", isValid: !/\s/.test(val) }
        ]);
        if (confirmInput.value) checkMatch();
    };
    const checkMatch = () => {
        updateChecklist(confirmInput, [{ text: "Passwords match", isValid: confirmInput.value === passwordInput.value && confirmInput.value !== "" }]);
    };
    passwordInput.addEventListener('input', check);
    passwordInput.addEventListener('focus', check);
    passwordInput.addEventListener('blur', () => removeTooltip('password'));
    confirmInput.addEventListener('input', checkMatch);
    confirmInput.addEventListener('focus', checkMatch);
    confirmInput.addEventListener('blur', () => removeTooltip('confirm_password'));
}

function validateResetPassword() {
    const newPassInput = document.getElementById('newPassword');

    const check = () => {
        const val = newPassInput.value;
        updateChecklist(newPassInput, [
            { text: "At least 8 characters", isValid: val.length >= 8 },
            { text: "One uppercase & one number", isValid: /[A-Z]/.test(val) && /\d/.test(val) },
            { text: "At least 1 special character", isValid: /[!@#$%^&*(),.?":{}|<>]/.test(val) },
            { text: "No spaces", isValid: !/\s/.test(val) }
        ]);
    };

    newPassInput.addEventListener('input', check);
    newPassInput.addEventListener('focus', check);
    newPassInput.addEventListener('blur', () => removeTooltip('new_password'));
}

/* --- INITIALIZE DROPDOWNS --- */
function initializeDobDropdowns() {
    const monthSel = document.getElementById('dob-month');
    const daySel = document.getElementById('dob-day');
    const yearSel = document.getElementById('dob-year');
    const currentYear = new Date().getFullYear();

    // Months
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((m, i) => {
        monthSel.options[monthSel.options.length] = new Option(m, i + 1);
    });

    // Days
    for (let i = 1; i <= 31; i++) {
        daySel.options[daySel.options.length] = new Option(i, i);
    }

    // Years (Limit: 15 to 100 years old)
    const startYear = currentYear - 15;  // 2011
    const endYear = currentYear - 100;   // 1926
    for (let i = startYear; i >= endYear; i--) {
        yearSel.options[yearSel.options.length] = new Option(i, i);
    }
}

/* --- UPDATED REGISTRATION HANDLER --- */
function handleRegistrationSubmit() {
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = signUpForm.querySelector('button');
        const originalText = submitBtn.innerText;
        const termsCheckbox = document.getElementById('terms-checkbox');

        // MANDATORY TERMS CHECK
        if (!termsCheckbox.checked) {
            alert("You must agree to the Terms and Conditions to create an account.");
            return;
        }

        // REGEX VALIDATIONS
        const isNameValid = /^[a-zA-Z\s]+,\s[a-zA-Z\s]+$/.test(nameInput.value.trim());
        const isEmailValid = /^[a-zA-Z0-9._%+-]+@(gmail\.com|example\.com)$/.test(emailInput.value.trim());
        const isPassValid = passwordInput.value.length >= 8 && /[A-Z]/.test(passwordInput.value);
        const isMatch = passwordInput.value === confirmInput.value;

        if (!isNameValid || !isEmailValid || !isPassValid || !isMatch) {
            alert("Please satisfy all requirements shown in the side tooltips.");
            return;
        }

        // COMBINE DOB FROM DROPDOWNS
        const year = document.getElementById('dob-year').value;
        const month = document.getElementById('dob-month').value.padStart(2, '0');
        const day = document.getElementById('dob-day').value.padStart(2, '0');
        const dobString = `${year}-${month}-${day}`;

        // NETWORK REQUEST
        submitBtn.innerText = "Sending OTP...";
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";

        const data = {
            name: nameInput.value.trim(),
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value,
            contact_number: contactInput.value,
            dob: dobString
        };

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.otpSent) {
                document.getElementById('otp-title').innerText = "Verify Registration";
                const overlay = document.getElementById('otp-overlay');
                overlay.setAttribute('data-mode', 'register');
                overlay.style.display = 'flex';
            } else {
                alert(result.message || "Registration error.");
            }
        } catch (error) {
            console.error("🔥 Error:", error);
            alert("Server connection failed.");
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
        }
    });

    // TRIGGER MODAL VIEW
    document.getElementById('open-terms').addEventListener('click', () => {
        document.getElementById('terms-modal').style.display = 'flex';
    });

    // AUTO-CHECK ON AGREE
    document.getElementById('agree-btn').addEventListener('click', () => {
        document.getElementById('terms-modal').style.display = 'none';
        document.getElementById('terms-checkbox').checked = true;
    });
}

function startLoginTimer(seconds) {
    const submitBtn = loginForm.querySelector('button');
    const originalText = "Login"; 
    let timeLeft = seconds;

    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.7";

    const timer = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timer);
            errorDiv.textContent = "";
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
            submitBtn.style.opacity = "1";
        } else {
            // Display the message in your errorDiv and on the button itself
            errorDiv.innerHTML = `Too many attempts. Try again in <b style="color:red;">${timeLeft}s</b>`;
            submitBtn.innerText = `Locked (${timeLeft}s)`;
            timeLeft--;
        }
    }, 1000);
}

initializeDobDropdowns();

function handleLoginSubmit() {
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const isTrusted = localStorage.getItem('device_trusted') === 'true';
            const submitBtn = loginForm.querySelector('button');
            const originalText = submitBtn.innerText;
            const emailField = loginForm.querySelector('input[name="email"]') || loginForm.querySelector('input[type="email"]');
            const passwordField = loginForm.querySelector('input[name="password"]') || loginForm.querySelector('input[type="password"]');

            if (!emailField || !passwordField) {
                console.error("Could not find login input fields. check your HTML names/types.");
                return;
            }

            const email = emailField.value;
            const password = passwordField.value;

            // IMMEDIATE FEEDBACK
            errorDiv.textContent = ""; 
            submitBtn.disabled = true;
            submitBtn.innerText = "Verifying...";
            submitBtn.style.opacity = "0.7";

            try {
                const response = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, isTrustedDevice: isTrusted })
                });


if (response.status === 429) {
    const rateLimitData = await response.json();
    
    // --- TRIGGER THE TIMER HERE ---
    if (rateLimitData.retryAfter) {
        startLoginTimer(rateLimitData.retryAfter);
    }
    
    throw new Error(rateLimitData.message || "Too many attempts.");
}

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Login failed.");
                }

                if (result.mfaRequired) {
                    const overlay = document.getElementById('otp-overlay');
                    if (overlay) {
                        overlay.style.display = 'flex'; 
                        overlay.setAttribute('data-mode', 'login');
                        overlay.setAttribute('data-email', email); 
                    }
                } else if (result.success) {
                    window.location.href = '/dashboard.html';
                } else {
                    errorDiv.textContent = result.message || "Invalid credentials.";
                    errorDiv.style.color = "red";
                }

            } catch (err) {
                errorDiv.textContent = err.message;
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                submitBtn.style.opacity = "1";
            }
        });
    }
}

async function verifyLoginOTP(otp) {
    const res = await fetch('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
    });
    const data = await res.json();
    if (data.success) window.location.href = '/dashboard.html';
    else alert("Invalid OTP");
}

/* UNIVERSAL OTP HANDLER */
function initializeOTPHandler() {
    const otpOverlay = document.getElementById('otp-overlay');
    const verifyBtn = document.getElementById('verify-btn');
    const otpInput = document.getElementById('otp-input');
    const cancelBtn = document.getElementById('cancel-otp');

    verifyBtn.addEventListener('click', async () => {
        const mode = otpOverlay.getAttribute('data-mode');
        const userEmail = otpOverlay.getAttribute('data-email'); 
        const otpValue = otpInput.value.trim();

        if (otpValue.length !== 6) {
            alert("Please enter the 6-digit code.");
            return;
        }

        verifyBtn.innerText = "Sending OTP in email...";
        verifyBtn.disabled = true;

        const endpoint = mode === 'register' ? '/verify-registration' : '/verify-otp';

        const requestData = { otp: otpValue };
        
        if (mode === 'login' && userEmail) {
            requestData.email = userEmail;
        }

        try {
            const response = await fetch(`http://localhost:3000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                if (mode === 'register') {
                    alert("Account Verified! Please log in.");
                    location.reload();
                } else {
                    // Login success
                    localStorage.setItem('device_trusted', 'true');
                    window.location.href = '/dashboard.html';
                }
            } else {
                alert("Invalid OTP code: " + (result.message || "Please try again."));
                otpInput.value = "";
            }
        } catch (err) {
            console.error("Verification error:", err);
            alert("Verification failed. Check your connection.");
        } finally {
            verifyBtn.innerText = "Verify Identity";
            verifyBtn.disabled = false;
        }
    });

    cancelBtn.addEventListener('click', () => {
        otpOverlay.style.display = 'none';
        otpInput.value = "";
    });
}

function showResetMessage(text, isError = false) {
    const msgDiv = document.getElementById('reset-msg');
    if (!msgDiv) return;
    
    msgDiv.textContent = text;
    msgDiv.style.display = 'block';
    
    if (isError) {
        msgDiv.style.backgroundColor = '#f8d7da'; 
        msgDiv.style.color = '#721c24';
        msgDiv.style.border = '1px solid #f5c6cb';
    } else {
        msgDiv.style.backgroundColor = '#d4edda'; 
        msgDiv.style.color = '#155724';
        msgDiv.style.border = '1px solid #c3e6cb';
    }
}

/* --- FORGOT PASSWORD TOGGLE --- */
function initializeForgotPassword() {
    const forgotLink = document.getElementById('forgot-password-link');
    const backBtn = document.getElementById('back-to-login');
    const forgotSection = document.getElementById('forgot-password-section');
    const signInContainer = document.querySelector('.form-container.sign-in');

    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            signInContainer.style.display = 'none';
            forgotSection.style.display = 'flex';
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            forgotSection.style.display = 'none';
            signInContainer.style.display = 'flex';
        });
    }
}

async function requestPasswordReset() {
    const email = document.getElementById('resetEmail').value;
    if (!email) return showResetMessage("Please enter your email", true);

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        if (result.success) {
            document.getElementById('otpSection').style.display = 'block';
            showResetMessage("OTP sent to your email!"); 
        } else {
            showResetMessage(result.message, true);
        }
    } catch (err) {
        showResetMessage("Server error. Please try again.", true);
    }
}

async function verifyAndReset() {
    const otp = document.getElementById('resetOTP').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!otp || !newPassword) return showResetMessage("Please fill in all fields", true);

    const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, newPassword })
    });

    const result = await response.json();
    if (result.success) {
        showResetMessage("Success! Your password has been updated.");
        setTimeout(() => {
            location.reload();
        }, 2000);
    } else {
        showResetMessage(result.message, true);
    }
}

// Call this at the bottom with your other initializers
initializeOTPHandler();
handleFormToggle();
initializePasswordToggles();
validateFullName();
validateUsername();
validateEmail();
validateContactNumber();
validatePasswords();
handleRegistrationSubmit();
handleLoginSubmit();
initializeForgotPassword();
validateResetPassword();
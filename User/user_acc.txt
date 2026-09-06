document.addEventListener("DOMContentLoaded", () => {
    let originalUserData = {};

    const nameInput = document.getElementById('input-name');
    const emailInput = document.getElementById('input-email');
    const contactInput = document.getElementById('input-contact');
    const dobInput = document.getElementById('input-dob');

    const editBtn = document.getElementById('edit-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const accountForm = document.getElementById('account-form');

    // Modal elements
    const otpModal = document.getElementById('otp-modal');
    const otpInput = document.getElementById('otp-input');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');

    // Fetch and populate data
    function loadUserData() {
        fetch('/user/me', { credentials: 'same-origin' })
            .then(res => res.json())
            .then(user => {
                if (!user) return;
                originalUserData = user;

                nameInput.value = user.name || '';
                emailInput.value = user.email || '';
                contactInput.value = user.contact_number || '';
                
                if (user.dob) {
                    const d = new Date(user.dob);
                    dobInput.value = d.toISOString().split('T')[0];
                }

                document.getElementById('user-fullname').textContent = user.name || 'User';
                document.getElementById('user-email').textContent = user.email || '';
            })
            .catch(err => console.error('Error fetching profile:', err));
    }

    loadUserData();

    // Toggle Edit Mode
    editBtn.addEventListener('click', () => {
        nameInput.disabled = false;
        emailInput.disabled = false;
        contactInput.disabled = false;
        dobInput.disabled = false;

        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
    });

    // Cancel Edit Mode
    cancelBtn.addEventListener('click', () => {
        loadUserData();

        nameInput.disabled = true;
        emailInput.disabled = true;
        contactInput.disabled = true;
        dobInput.disabled = true;

        editBtn.style.display = 'inline-block';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    });

    // Handle Account Form Submission
    accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const updatedData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            contact_number: contactInput.value.trim(),
            dob: dobInput.value
        };

        if (updatedData.email !== originalUserData.email) {
            try {
                const res = await fetch('/api/user/request-email-change', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newEmail: updatedData.email })
                });
                const result = await res.json();

                if (res.ok && result.success) {
                    otpModal.style.display = 'flex';
                } else {
                    alert(result.message || "Failed to send verification code.");
                }
            } catch (err) {
                console.error("Error requesting OTP:", err);
            }
        } else {
            saveProfileChanges(updatedData);
        }
    });

    async function saveProfileChanges(data) {
        try {
            const res = await fetch('/api/user/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert("Profile updated successfully!");
                location.reload();
            } else {
                alert(result.message || "Update failed.");
            }
        } catch (err) {
            console.error("Save error:", err);
        }
    }

    // Verify OTP for Email Change
    verifyOtpBtn.addEventListener('click', async () => {
        const otp = otpInput.value.trim();
        const newEmail = emailInput.value.trim();

        if (otp.length !== 6) {
            alert("Please enter a valid 6-digit code.");
            return;
        }

        try {
            const res = await fetch('/api/user/verify-email-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, newEmail })
            });
            const result = await res.json();

            if (res.ok && result.success) {
                await fetch('/api/user/update-profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput.value.trim(),
                        email: newEmail,
                        contact_number: contactInput.value.trim(),
                        dob: dobInput.value
                    })
                });

                alert("Profile and email updated successfully!");
                location.reload();
            } else {
                alert(result.message || "Invalid or expired verification code.");
            }
        } catch (err) {
            console.error("OTP verification error:", err);
        }
    });

    // ==========================================
    // PASSWORD MODAL CONTROLS & VALIDATION
    // ==========================================
    const pwLink = document.querySelector('.change-pw');
    const pwModal = document.getElementById('password-modal');
    const closePwBtn = document.getElementById('close-password-btn');
    const changePasswordForm = document.getElementById('changePasswordForm');

    if (pwLink) {
        pwLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (pwModal) pwModal.style.display = 'flex';
        });
    }

    // Eye Toggle Handler
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);

            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // Helper to clear red error borders and error message banner
    function clearPasswordErrors() {
        const errorMsg = document.getElementById('password-error-msg');
        if (errorMsg) {
            errorMsg.style.display = 'none';
            errorMsg.textContent = '';
        }

        ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.style.borderColor = '#ccc';
            }
        });
    }

    // Helper to highlight invalid inputs red and display error banner
    function showPasswordError(message, invalidInputIds = []) {
        clearPasswordErrors();

        const errorMsg = document.getElementById('password-error-msg');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
        }

        invalidInputIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.style.borderColor = '#d9534f';
            }
        });
    }

    // Close Modal Reset
    if (closePwBtn) {
        closePwBtn.addEventListener('click', () => {
            if (pwModal) pwModal.style.display = 'none';
            if (changePasswordForm) changePasswordForm.reset();
            clearPasswordErrors();
        });
    }

    // Single Form Submission Handler
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearPasswordErrors();

            const currentInput = document.getElementById('currentPassword');
            const newInput = document.getElementById('newPassword');
            const confirmInput = document.getElementById('confirmNewPassword');

            const currentPassword = currentInput.value;
            const newPassword = newInput.value;
            const confirmNewPassword = confirmInput.value;

            // 1. Check Passwords Match
            if (newPassword !== confirmNewPassword) {
                showPasswordError('New passwords do not match.', ['newPassword', 'confirmNewPassword']);
                return;
            }

            // 2. Check Password Strength Rules
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                showPasswordError(
                    'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&).',
                    ['newPassword']
                );
                return;
            }

            try {
                const response = await fetch('/api/user/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Hide the form and show the green checkmark UI
                    const formContainer = document.getElementById('password-form-container');
                    const successContainer = document.getElementById('password-success-container');

                    if (formContainer) formContainer.style.display = 'none';
                    if (successContainer) successContainer.style.display = 'block';

                    // Redirect to index.html after 1.5 seconds
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);

                } else {
                    // Show backend error inline (e.g., incorrect current password)
                    showPasswordError(
                        data.message || 'Failed to update password.',
                        data.message && data.message.toLowerCase().includes('current') ? ['currentPassword'] : ['newPassword']
                    );
                }
            } catch (err) {
                console.error('Error changing password:', err);
                showPasswordError('An error occurred. Please try again.');
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", () => {
    let originalUserData = {};
    let otpPurpose = null; // 'email' | 'password' — which flow the OTP modal is currently serving
    let pendingNewPassword = null; // held only in memory, never persisted client-side

    // Site-wide "little pop on the side" toast, with an alert() fallback
    // for safety if notifications.js hasn't loaded for some reason.
    function notify(title, message, iconClass = 'fa-solid fa-bell') {
        if (typeof showRefoundlyToast === 'function') {
            showRefoundlyToast(title, message, iconClass);
        } else {
            alert(message || title);
        }
    }

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

    // Retitles/re-describes the shared OTP modal so it reads correctly
    // whether it's confirming an email change or a password change.
    function setOtpModalCopy(title, description) {
        const titleEl = otpModal ? otpModal.querySelector('h2, h3, .otp-modal-title') : null;
        const descEl = otpModal ? otpModal.querySelector('p, .otp-modal-desc') : null;
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description;
    }

    // ==========================================
    // PROFILE PICTURE
    // ==========================================
    const MAX_MB = 2;                              // biggest photo a person may pick
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const OUTPUT_SIZE = 400;                       // photo is cropped square + shrunk to 400x400 before upload

    const avatarEl = document.getElementById('avatar');
    const avatarInitialsEl = document.getElementById('avatar-initials');
    const avatarChangeBtn = document.getElementById('avatar-change-btn');
    const avatarToolsEl = document.getElementById('avatar-tools');
    const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
    const avatarInput = document.getElementById('avatar-input');

    let editing = false;
    let pendingAvatarBlob = null;     // chosen photo, uploaded when "Save Changes" is pressed
    let pendingAvatarUrl = null;      // local preview of that photo
    let avatarRemoved = false;        // "Remove photo" pressed, applied on save

    const AVATAR_COLORS = ['#6B9E45', '#5D8252', '#3F7D6B', '#7A8F3C', '#8A6D3B', '#4E7A8A', '#7B6B9E'];

    function initialsOf(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].charAt(0);
        return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    }

    function colorFor(name) {
        let hash = 0;
        const s = String(name || '');
        for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
        return AVATAR_COLORS[hash % AVATAR_COLORS.length];
    }

    // only allow plain file paths/URLs in the CSS url("...")
    function safeImageUrl(url) {
        return typeof url === 'string' && /^[\w\-./?=&%:]+$/.test(url) ? url : null;
    }

    function renderAvatar() {
        if (!avatarEl) return;
        const name = (editing ? nameInput.value : originalUserData.name) || originalUserData.name || '';
        const savedUrl = avatarRemoved ? null : safeImageUrl(originalUserData.profile_picture);
        const url = pendingAvatarUrl || savedUrl;

        if (url) {
            avatarEl.style.backgroundImage = `url("${url}")`;
            avatarEl.style.backgroundColor = '#d9d9d9';
            avatarInitialsEl.textContent = '';
        } else {
            avatarEl.style.backgroundImage = 'none';
            avatarEl.style.backgroundColor = colorFor(name);
            avatarInitialsEl.textContent = initialsOf(name);
        }
        avatarEl.setAttribute('aria-label', url ? 'Profile picture' : `Profile picture (initials ${initialsOf(name)})`);

        // edit-only controls
        avatarChangeBtn.style.display = editing ? 'flex' : 'none';
        avatarToolsEl.style.display = editing ? 'flex' : 'none';
        avatarRemoveBtn.style.display = editing && url ? 'inline-block' : 'none';
    }

    function resetPendingAvatar() {
        if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
        pendingAvatarBlob = null;
        pendingAvatarUrl = null;
        avatarRemoved = false;
        if (avatarInput) avatarInput.value = '';
    }

    // center-crop to a square, shrink to 400x400, save as JPEG (small + consistent)
    function squareResize(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const src = URL.createObjectURL(file);
            img.onload = () => {
                try {
                    const side = Math.min(img.naturalWidth, img.naturalHeight);
                    const sx = (img.naturalWidth - side) / 2;
                    const sy = (img.naturalHeight - side) / 2;
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = OUTPUT_SIZE;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';              // transparent PNGs become white, not black
                    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
                    ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
                    canvas.toBlob(b => b ? resolve(b) : reject(new Error('encode failed')), 'image/jpeg', 0.88);
                } catch (err) { reject(err); }
                finally { URL.revokeObjectURL(src); }
            };
            img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('unreadable image')); };
            img.src = src;
        });
    }

    async function handleAvatarFile(file) {
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            notify("Unsupported file", "Please choose a JPG, PNG or WebP image.", "fa-solid fa-circle-exclamation");
            avatarInput.value = '';
            return;
        }
        if (file.size > MAX_BYTES) {
            const mb = (file.size / (1024 * 1024)).toFixed(1);
            notify("Photo too large", `That photo is ${mb} MB. The limit is ${MAX_MB} MB.`, "fa-solid fa-circle-exclamation");
            avatarInput.value = '';
            return;
        }

        try {
            const blob = await squareResize(file);
            if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
            pendingAvatarBlob = blob;
            pendingAvatarUrl = URL.createObjectURL(blob);
            avatarRemoved = false;
            renderAvatar();
        } catch (err) {
            console.error('Avatar processing failed:', err);
            notify("Couldn't read that photo", "Please try a different image.", "fa-solid fa-circle-exclamation");
            avatarInput.value = '';
        }
    }

    // Uploads / removes the photo. Throws an Error with a readable message on failure.
    async function saveAvatarChanges() {
        if (pendingAvatarBlob) {
            const fd = new FormData();
            fd.append('avatar', pendingAvatarBlob, 'avatar.jpg');
            const res = await fetch('/api/user/profile-picture', { method: 'POST', body: fd, credentials: 'same-origin' });
            const result = await res.json().catch(() => ({}));
            if (!res.ok || !result.success) throw new Error(result.message || 'Photo upload failed.');
            originalUserData.profile_picture = result.profile_picture;
            resetPendingAvatar();
        } else if (avatarRemoved) {
            const res = await fetch('/api/user/profile-picture', { method: 'DELETE', credentials: 'same-origin' });
            const result = await res.json().catch(() => ({}));
            if (!res.ok || !result.success) throw new Error(result.message || 'Could not remove the photo.');
            originalUserData.profile_picture = null;
            avatarRemoved = false;
        }
    }

    avatarChangeBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', () => handleAvatarFile(avatarInput.files[0]));
    avatarRemoveBtn.addEventListener('click', () => {
        if (pendingAvatarUrl) URL.revokeObjectURL(pendingAvatarUrl);
        pendingAvatarBlob = null;
        pendingAvatarUrl = null;
        avatarInput.value = '';
        avatarRemoved = true;
        renderAvatar();
    });
    // initials follow the name while it is being edited
    nameInput.addEventListener('input', () => { if (editing) renderAvatar(); });

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
                renderAvatar();
            })
            .catch(err => console.error('Error fetching profile:', err));
    }

    loadUserData();

    // Toggle Edit Mode
    editBtn.addEventListener('click', () => {
        editing = true;
        renderAvatar();
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
        editing = false;
        resetPendingAvatar();
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

        // 1) profile picture first (its own upload) - stop here if it fails
        try {
            await saveAvatarChanges();
        } catch (err) {
            notify("Photo not saved", err.message || "Please try again.", "fa-solid fa-circle-exclamation");
            return;
        }

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
                    otpPurpose = 'email';
                    setOtpModalCopy(
                        'Email Change Verification',
                        `Enter the 6-digit code we sent to ${updatedData.email} to confirm your new email.`
                    );
                    otpModal.style.display = 'flex';
                } else {
                    notify("Verification Failed", result.message || "Failed to send verification code.", "fa-solid fa-circle-exclamation");
                }
            } catch (err) {
                console.error("Error requesting OTP:", err);
                notify("Error", "An error occurred sending the verification code. Please try again.", "fa-solid fa-circle-exclamation");
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
                notify("Profile Updated", "Your profile was updated successfully!", "fa-solid fa-circle-check");
                setTimeout(() => location.reload(), 1200);
            } else {
                notify("Update Failed", result.message || "Update failed.", "fa-solid fa-circle-exclamation");
            }
        } catch (err) {
            console.error("Save error:", err);
            notify("Error", "An error occurred while saving your profile. Please try again.", "fa-solid fa-circle-exclamation");
        }
    }

    // Verify OTP — shared by both the email-change and password-change flows
    verifyOtpBtn.addEventListener('click', async () => {
        const otp = otpInput.value.trim();

        if (otp.length !== 6) {
            notify("Invalid Code", "Please enter a valid 6-digit code.", "fa-solid fa-circle-exclamation");
            return;
        }

        if (otpPurpose === 'password') {
            try {
                const res = await fetch('/api/user/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ otp })
                });
                const result = await res.json();

                if (res.ok && result.success) {
                    otpModal.style.display = 'none';
                    otpInput.value = '';
                    pendingNewPassword = null;

                    // Hide the password form and show the green checkmark UI
                    const formContainer = document.getElementById('password-form-container');
                    const successContainer = document.getElementById('password-success-container');
                    if (formContainer) formContainer.style.display = 'none';
                    if (successContainer) successContainer.style.display = 'block';

                    if (changePasswordForm) changePasswordForm.reset();

                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    notify("Verification Failed", result.message || "Invalid or expired verification code.", "fa-solid fa-circle-exclamation");
                }
            } catch (err) {
                console.error("Password OTP verification error:", err);
                notify("Error", "An error occurred verifying the code. Please try again.", "fa-solid fa-circle-exclamation");
            }
            return;
        }

        // Default / 'email' purpose
        const newEmail = emailInput.value.trim();

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

                notify("Profile Updated", "Your profile and email were updated successfully!", "fa-solid fa-circle-check");
                setTimeout(() => location.reload(), 1200);
            } else {
                notify("Verification Failed", result.message || "Invalid or expired verification code.", "fa-solid fa-circle-exclamation");
            }
        } catch (err) {
            console.error("OTP verification error:", err);
            notify("Error", "An error occurred updating your profile. Please try again.", "fa-solid fa-circle-exclamation");
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
                const response = await fetch('/api/user/request-password-change-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Current password was correct and a code has been
                    // emailed. The new password itself is never sent again —
                    // the server already holds it (hashed) pending OTP.
                    pendingNewPassword = true;

                    if (pwModal) pwModal.style.display = 'none';
                    otpPurpose = 'password';
                    setOtpModalCopy(
                        'Password Change Verification',
                        'Enter the 6-digit code we sent to your email to confirm your new password.'
                    );
                    if (otpModal) otpModal.style.display = 'flex';
                } else {
                    // Show backend error inline (e.g., incorrect current password)
                    showPasswordError(
                        data.message || 'Failed to send verification code.',
                        data.message && data.message.toLowerCase().includes('current') ? ['currentPassword'] : ['newPassword']
                    );
                }
            } catch (err) {
                console.error('Error requesting password change:', err);
                showPasswordError('An error occurred. Please try again.');
            }
        });
    }
});
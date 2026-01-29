// Login function
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    if (!errorDiv) return;

    errorDiv.textContent = '';

    fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.href = 'AdHome.html';
        } else {
            errorDiv.textContent = data.message;
        }
    })
    .catch(err => {
        console.error(err);
        errorDiv.textContent = 'Server error. Try again later.';
    });
}

// Safe login form listener
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        login();             
    });
}

// Logout function
function logout() {
    fetch('/admin/logout', { method: 'POST' })
        .then(() => window.location.href = 'AdLogin.html')
        .catch(err => console.error("Logout failed:", err));
}

// Fetch admin profile for sidebar/account page
function fetchAdminProfile() {
    fetch('/admin/me')
        .then(res => {
            if (!res.ok) throw new Error("Not logged in or session expired");
            return res.json();
        })
        .then(admin => {
            const emailElement = document.getElementById('admin-email');
            const contactElement = document.getElementById('admin-contact');
            const sidebarName = document.querySelector('.profile-left h3');

            if (emailElement) emailElement.textContent = admin.email;
            if (contactElement) contactElement.textContent = admin.contact_number || 'Not Set';
            if (sidebarName) sidebarName.textContent = admin.name || admin.email || 'Admin';
        })
        .catch(err => console.error("Profile fetch error:", err.message));
}

// Run fetchAdminProfile on page load if on account/dashboard page
document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector('.content-wrapper')) fetchAdminProfile();
});

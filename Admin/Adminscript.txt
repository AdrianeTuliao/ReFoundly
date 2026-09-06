const API_BASE = 'http://localhost:3000';

// Helper to get CSRF token (Required by your backend csurf middleware)
async function getCsrfToken() {
    const res = await fetch(`${API_BASE}/api/csrf-token`, { credentials: 'include' });
    const data = await res.json();
    return data.csrfToken;
}

function checkAdminSession() {
    if (!window.location.pathname.includes('AdLogin.html')) {
        fetch(`${API_BASE}/admin/me`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) window.location.href = 'AdLogin.html';
            })
            .catch(() => { window.location.href = 'AdLogin.html'; });
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    if (!errorDiv) return;
    errorDiv.textContent = '';

    try {
        const csrfToken = await getCsrfToken(); 

        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken 
            },
            credentials: 'include', 
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        if (data.success) {
            window.location.href = 'AdHome.html';
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.add('shake');
        }
    } catch (err) {
        console.error(err);
        errorDiv.textContent = 'Server error. Check if backend is running on Port 3000.';
    }
}

async function logout() {
    try {
        const csrfToken = await getCsrfToken();
        const res = await fetch(`${API_BASE}/admin/logout`, { 
            method: 'POST', 
            headers: { 'CSRF-Token': csrfToken },
            credentials: 'include' 
        });
        const data = await res.json();
        if (data.success) {
            window.location.replace('AdLogin.html');
        }
    } catch (err) {
        console.error("Logout Error:", err);
    }
}

function fetchAdminProfile() {
    // Added API_BASE and credentials
    fetch(`${API_BASE}/admin/me`, { credentials: 'include' })
        .then(res => {
            if (!res.ok) throw new Error("Session expired");
            return res.json();
        })
        .then(admin => {
            const emailElement = document.getElementById('admin-email');
            const sidebarName = document.querySelector('.profile-left h3');
            if (emailElement) emailElement.textContent = admin.email;
            if (sidebarName) sidebarName.textContent = admin.name || admin.email;
        })
        .catch(err => console.error("Profile fetch error:", err.message));
}

// Initialize
checkAdminSession();
document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector('.content-wrapper')) fetchAdminProfile();
    
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById('logout-link');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            logout();          
        });
    }
});

// Example fetch call inside user login submission
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    if (!errorDiv) return;
    errorDiv.textContent = '';

    try {
        const csrfToken = await getCsrfToken(); 

        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken 
            },
            credentials: 'include', 
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        if (data.success) {
            window.location.href = 'AdHome.html';
        } else if (data.isSuspended) {
            // 🟢 Lalabas ang Popup Modal kapag suspended
            const reasonContainer = document.getElementById('modalReasonText');
            if (reasonContainer) {
                if (Array.isArray(data.suspend_reasons) && data.suspend_reasons.length > 0) {
                    reasonContainer.innerHTML = data.suspend_reasons.map(r => `• ${r}`).join('<br>');
                } else {
                    reasonContainer.innerText = "Violation of Terms and Conditions.";
                }
            }
            document.getElementById('suspendedModal').style.display = 'flex';
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.add('shake');
        }
    } catch (err) {
        console.error(err);
        errorDiv.textContent = 'Server error. Check if backend is running on Port 3000.';
    }
}

// 🟢 Idagdag din ito sa dulo ng Adminscript.js para sa Close button ng modal
function closeModal() {
    const modal = document.getElementById('suspendedModal');
    if (modal) modal.style.display = 'none';
}
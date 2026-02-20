document.addEventListener("DOMContentLoaded", () => {
    // Elements from the Sidebar
    const fullname = document.getElementById('user-fullname');
    const email = document.getElementById('user-email');

    // Elements from the Personal Information Grid
    const infoFullname = document.getElementById('info-name');
    const infoEmail = document.getElementById('info-email');
    const infoContact = document.getElementById('info-contact');
    const infoDob = document.getElementById('info-dob');

    // Fetch user profile
    fetch('/user/me', { credentials: 'same-origin' })
    .then(res => {
        if (res.status === 401) {
            window.location.href = '/index.html';
            return;
        }
        if (!res.ok) {
            throw new Error(`Server error: ${res.status}`);
        }
        return res.json();
    })
    .then(user => {
        if (user) {
            // Populate Sidebar
            fullname.textContent = user.name || 'User';
            if (email) email.textContent = user.email || '';

            // Populate Info Grid
            if (infoFullname) infoFullname.textContent = user.name || '';
            if (infoEmail) infoEmail.textContent = user.email || '';
            
            // These will now work because you added the columns to MySQL
            if (infoContact) infoContact.textContent = user.contact_number || 'Not Set';
            if (infoDob) infoDob.textContent = user.dob || 'Not Set';
        }
    })
    .catch(err => {
        console.error('Fetch error:', err);
    });
    
    // Sign out logic
    const signOutBtn = document.querySelector('.sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            fetch('/logout', { method: 'POST', credentials: 'same-origin' })
                .then(res => {
                    if (!res.ok) throw new Error('Logout failed');
                    window.location.href = '/index.html';
                })
                .catch(err => console.error(err));
        });
    }
});

    function checkSession() {
    fetch('/user/me')
        .then(response => {
            if (response.status === 401) {
                const modal = document.getElementById('session-alert');
                if (modal) {
                    modal.style.setProperty('display', 'flex', 'important');
                }
            }
        })
        .catch(err => {
            console.log("Connection lost or session check failed.");
        });
}
setInterval(checkSession, 5000);
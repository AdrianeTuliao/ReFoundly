function initSessionMonitor() {
    const timeout = 15000; // 15 seconds for Sprint 1 testing

    console.log("ReFoundly session monitor started... waiting 15s");

    setTimeout(() => {
        const modal = document.getElementById('session-alert');
        if (modal) {
            modal.style.setProperty('display', 'block', 'important');
            console.log("Session expired! Modal is now visible.");
        } else {
            console.error("Could not find session-alert div!");
        }
    }, timeout);
}

function redirectToLogin() {
    fetch('/logout', { method: 'POST' })
        .then(() => {
            window.location.href = "/index.html";
        })
        .catch(() => {
            window.location.href = "/index.html";
        });
}

window.addEventListener('load', initSessionMonitor);
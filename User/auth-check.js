function ensureModalExists() {
    if (!document.getElementById('session-alert')) {
        const style = `
            <style>
                #session-alert {
                    display: none; position: fixed; top: 0; left: 0; 
                    width: 100%; height: 100%; background: rgba(0,0,0,0.85); 
                    z-index: 10000; justify-content: center; align-items: center;
                }
                .modal-content {
                    background: white; padding: 40px; border-radius: 12px; 
                    text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    max-width: 400px; font-family: sans-serif;
                }
                .modal-content h2 { color: #d9534f; margin-top:0; } /* Red for urgency! */
                .modal-content button {
                    background: #7aa340; color: white; border: none; 
                    padding: 12px 25px; border-radius: 6px; cursor: pointer;
                    font-weight: bold; margin-top: 20px; font-size: 16px;
                }
            </style>
        `;
        
        const html = `
            <div id="session-alert">
                <div class="modal-content">
                    <h2>Session Expired!</h2>
                    <p style="color: #666;">For your security, you have been logged out of ReFoundly</p>
                    <button onclick="window.location.href='/index.html'">Return to Login Now</button>
                </div>
            </div>
        `;
        
        document.head.insertAdjacentHTML('beforeend', style);
        document.body.insertAdjacentHTML('beforeend', html);
    }
}

function checkSession() {
    ensureModalExists(); 
    
    fetch('/user/me', { 
        headers: { 'Accept': 'application/json' } 
    })
    .then(res => {
        if (res.status === 401) {
            console.log("Session expired! Showing modal...");
            document.getElementById('session-alert').style.display = 'flex';
        }
    })
    .catch(err => {
        console.warn("Connection lost or session check failed!");
    });
}

// Check every 10 seconds
document.addEventListener('DOMContentLoaded', checkSession);
setInterval(checkSession, 10000);
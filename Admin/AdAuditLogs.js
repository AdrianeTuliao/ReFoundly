let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;

// --- GLOBAL STATE FOR PAGINATION & SEARCH ---
let allLogs = [];         
let filteredLogs = [];    
let currentPage = 1;
const logsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("audit-wrapper");
    
    if (wrapper) {
        setTimeout(() => wrapper.classList.add("fade-in"), 100);
    }

    fetchLogs();           
    updateNotifBadge();    
    checkNotifications(); 
    setInterval(checkNotifications, 20000);
    setInterval(fetchLogs, 30000); 

    // --- SEARCH & PAGINATION LISTENERS ---
    const searchInput = document.getElementById('auditSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    const bell = document.querySelector('.fa-bell');
    const clearBtn = document.getElementById('clearNotifsBtn');

    if (bell) {
        bell.id = "notifBell"; 
        bell.addEventListener('click', toggleNotifs);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllNotifs);
    }

    const navLinks = document.querySelectorAll('.sidebar nav a, .sidebar-footer a, .avatar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.hostname === window.location.hostname && !link.hash) {
                e.preventDefault();
                const nextURL = link.href;
                if(wrapper) wrapper.classList.remove("fade-in");
                setTimeout(() => { window.location.href = nextURL; }, 500);
            }
        });
    });
});

// fetchLogs now stores data globally and triggers the filter/render flow
async function fetchLogs() {
    try {
        const response = await fetch('/api/admin/audit_logs');
        allLogs = await response.json();
        handleSearch(); // Initialize the table display
    } catch (err) {
        console.error("Audit Fetch Error:", err);
    }
}

// Search Filter Logic
function handleSearch() {
    const query = document.getElementById('auditSearch')?.value.toLowerCase() || "";
    
    filteredLogs = allLogs.filter(log => {
        const user = (log.admin_email || log.user_name || log.guest_identifier || "").toLowerCase();
        const action = log.action.toLowerCase();
        const wallet = (log.wallet_address || "").toLowerCase();
        return user.includes(query) || action.includes(query) || wallet.includes(query);
    });

    currentPage = 1; // Reset to page 1 on search
    renderTable();
}

// Render function containing your original row-mapping logic
function renderTable() {
    const container = document.getElementById('audit-log-body');
    const pageInfo = document.getElementById('pageInfo');
    if (!container) return;

    // PAGINATION CALCULATION
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
    const start = (currentPage - 1) * logsPerPage;
    const end = start + logsPerPage;
    const paginatedItems = filteredLogs.slice(start, end);

    if (pageInfo) pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;

    container.innerHTML = paginatedItems.map(log => {
        // --- DATA PROCESSING LOGIC ---
        let detailsObj = {};
        try {
            detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        } catch(e) { detailsObj = { raw: log.details }; }

        let displayDetails = "—";
        if (detailsObj.item) {
            displayDetails = `<em>Item: ${detailsObj.item} (${detailsObj.type})</em>`;
        } else if (detailsObj.itemId) {
            displayDetails = `<em>Update ID: ${detailsObj.itemId} -> ${detailsObj.status}</em>`;
        }

        const wallet = log.wallet_address || "No Wallet Recorded";
        const txHash = detailsObj.txHash || log.blockchain_tx || "N/A";
        const shortHash = txHash !== "N/A" ? `${txHash.substring(0, 6)}...${txHash.substring(txHash.length - 4)}` : "Pending/NA";

        let badgeClass = "badge-report"; 
        if (log.action.includes('ADMIN')) {
            badgeClass = "badge-admin";  
        } else if (log.action.includes('LOGIN')) {
            badgeClass = "badge-security"; 
        }

        let userDisplay = "Guest User";
        if (log.admin_email) {
            userDisplay = `<span class="admin-label">Admin:</span> ${log.admin_email}`;
        } else if (log.user_name) {
            userDisplay = log.user_name;
        } else if (log.guest_identifier) {
            userDisplay = `<span style="color: #d32f2f; font-weight:600;">User:</span> ${log.guest_identifier}`;
        }

        return `
            <tr>
                <td><strong>${new Date(log.created_at).toLocaleDateString()}</strong><br><small>${new Date(log.created_at).toLocaleTimeString()}</small></td>
                <td>${userDisplay}</td>
                <td><span class="log-badge ${badgeClass}">${log.action.replace(/_/g, ' ')}</span></td>
                <td class="details-cell">${displayDetails}</td>
                <td>
                    <div style="font-size: 0.8rem; line-height: 1.2;">
                        <span style="color: #000000; font-weight: 600;">Wallet:</span> <code>${wallet}</code><br>
                        <span style="color: #000000; font-weight: 600;">TX:</span> <code title="${txHash}">${shortHash}</code>
                    </div>
                </td>
                <td><code>${log.ip_address}</code></td>
            </tr>
        `;
    }).join('');
}

/* --- NOTIFICATION & TRANSITION LOGIC --- */
async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items');
        const freshData = await response.json();

        freshData.forEach(item => {
            if (!knownItemIds.has(item.id)) {
                if (!isInitialLoad || item.status === "Pending Approval") {
                    addNotif(`New Report: ${item.item_name}`, item.id);
                }
                knownItemIds.add(item.id);
            }
        });

        localStorage.setItem('refoundly_known_ids', JSON.stringify([...knownItemIds]));
        isInitialLoad = false;
    } catch (error) {
        console.error("Notification Fetch Error:", error);
    }
}

function addNotif(text, itemId) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    notifications.unshift({ text, time, itemId, read: false });
    if (notifications.length > 20) notifications.pop();
    
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
}

function updateNotifBadge() {
    const badge = document.querySelector(".notif-badge");
    if (!badge) return;
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? "block" : "none";
}

function toggleNotifs() {
    const drop = document.getElementById("notifDropdown");
    const list = document.getElementById("notifList");
    if (!drop || !list) return;

    const isOpening = drop.style.display === "none" || drop.style.display === "";
    drop.style.display = isOpening ? "block" : "none";
    
    if(isOpening) {
        if (notifications.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: #999; font-size: 0.85rem;">No notifications</div>`;
        } else {
            list.innerHTML = ""; 
            notifications.forEach((n, index) => {
                const item = document.createElement('div');
                item.style.cssText = `padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 0.85rem; color: #444; cursor: pointer; background: ${n.read ? 'white' : '#f0f7ef'}`;
                item.innerHTML = `<strong>${n.time}</strong>: ${n.text}`;
                item.addEventListener('click', () => {
                    notifications[index].read = true;
                    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
                    window.location.href = 'AdReport.html';
                });
                list.appendChild(item);
            });
        }
    }
}

function clearAllNotifs() {
    notifications = [];
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    const drop = document.getElementById("notifDropdown");
    if (drop) drop.style.display = "none";
}
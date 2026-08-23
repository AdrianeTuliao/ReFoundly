let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;
let currentNotifTab = 'all';

// --- GLOBAL STATE FOR PAGINATION & SEARCH ---
let allLogs = [];         
let filteredLogs = [];    
let currentPage = 1;
const logsPerPage = 8;

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
    const searchInput = document.getElementById('userSearch');
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

    document.getElementById('tabAll')?.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        switchTab('all'); 
    });
    document.getElementById('tabUnread')?.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        switchTab('unread'); 
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

function switchTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll').classList.toggle('active', type === 'all');
    document.getElementById('tabUnread').classList.toggle('active', type === 'unread');
    renderNotifDropdown();
}

// Fetch logs with safety check against non-array responses
async function fetchLogs() {
    try {
        const response = await fetch('/api/admin/audit_logs');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        allLogs = Array.isArray(data) ? data : (data.logs || data.data || []);
        handleSearch(); 
    } catch (err) {
        console.error("Audit Fetch Error:", err);
        allLogs = [];
        renderTable();
    }
}

// Search Filter Logic using corrected 'userSearch' ID
function handleSearch() {
    const query = document.getElementById('userSearch')?.value.toLowerCase() || "";
    
    filteredLogs = allLogs.filter(log => {
        const user = (log.admin_email || log.user_name || log.guest_identifier || "").toLowerCase();
        const action = (log.action || "").toLowerCase();
        const wallet = (log.wallet_address || "").toLowerCase();
        return user.includes(query) || action.includes(query) || wallet.includes(query);
    });

    currentPage = 1;
    renderTable();
}

// Render function containing original row-mapping logic
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
        let detailsObj = {};
        try {
            detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
        } catch(e) { detailsObj = { raw: log.details }; }
        
        let displayDetails = "—";
        if (detailsObj.item) {
            displayDetails = `<em>Item: ${detailsObj.item} (${detailsObj.type})</em>`;
        } else if (detailsObj.itemId) {
            displayDetails = `<em>Update ID: ${detailsObj.itemId} -> ${detailsObj.status}</em>`;
        } else if (log.action === 'SECURITY_BRUTE_FORCE_BLOCK') {
            displayDetails = `<strong style="color:red;">Blocked for ${detailsObj.retryAfter}s</strong>`;
        } else if (log.action === 'SECURITY_LOGIN_FAILURE' || log.action === 'SECURITY_ADMIN_LOGIN_FAILURE') {
            displayDetails = `<span style="color:orange;">Reason: ${detailsObj.reason || 'N/A'}</span>`;
        }

        const logAction = log.action || "";
        let badgeClass = "badge-report"; 
        if (logAction.includes('ADMIN')) {
            badgeClass = "badge-admin";  
        } else if (logAction.includes('SECURITY')) { 
            badgeClass = "badge-security"; 
        }

        let userDisplay = "Guest User";
        if (log.admin_email) {
            userDisplay = `<span class="admin-label">Admin:</span> ${log.admin_email}`;
        } else if (log.user_name) {
            userDisplay = log.user_name;
        } else if (log.guest_identifier) {
            const isAdminAction = logAction.includes('ADMIN');
            const label = isAdminAction ? 'Admin:' : 'User:';
            const labelColor = isAdminAction ? '#7aa340' : '#d32f2f';
            
            userDisplay = `<span style="color: ${labelColor}; font-weight:600;">${label}</span> ${log.guest_identifier}`;
        }

        return `
            <tr>
                <td><strong>${new Date(log.created_at).toLocaleDateString()}</strong><br><small>${new Date(log.created_at).toLocaleTimeString()}</small></td>
                <td>${userDisplay}</td>
                <td><span class="log-badge ${badgeClass}">${logAction.replace(/_/g, ' ')}</span></td>
                <td class="details-cell">${displayDetails}</td>
            </tr>
        `;
    }).join('');
}

/* --- NOTIFICATION & TRANSITION LOGIC --- */
async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const freshData = await response.json();
        const itemsArray = Array.isArray(freshData) ? freshData : (freshData.items || freshData.data || []);

        itemsArray.forEach(item => {
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
    if (!drop) return;
    const isOpening = drop.style.display === "none" || drop.style.display === "";
    drop.style.display = isOpening ? "block" : "none";
    
    if (isOpening) renderNotifDropdown();
}

function renderNotifDropdown() {
    const list = document.getElementById("notifList");
    if (!list) return;

    let displayList = [...notifications];
    if (currentNotifTab === 'unread') {
        displayList = displayList.filter(n => !n.read);
    }

    if (displayList.length === 0) {
        list.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #999; font-size: 0.85rem;">
            No ${currentNotifTab === 'unread' ? 'unread' : ''} notifications
        </div>`;
        return;
    }

    list.innerHTML = displayList.map((n) => {
        const globalIndex = notifications.indexOf(n);
        return `
        <div class="notif-item-modern ${n.read ? '' : 'unread-bg'}" onclick="handleNotifClick(${globalIndex})">
            <div class="notif-icon-circle" style="width:35px; height:35px; border-radius:50%; background:#7aa340; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-file-invoice" style="font-size:0.8rem;"></i>
            </div>
            <div style="flex-grow:1;">
                <div style="font-size:0.85rem; color:#1c1e21; font-weight:${n.read ? '400' : '600'}">${n.text}</div>
                <div style="font-size:0.75rem; color:#65676b;">${n.time}</div>
            </div>
            ${!n.read ? '<div class="unread-dot-small"></div>' : ''}
        </div>
    `;}).join('');
}

function handleNotifClick(index) {
    if (index === -1) return;
    notifications[index].read = true;
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    window.location.href = 'AdReport.html';
}

function clearAllNotifs() {
    notifications = [];
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    const drop = document.getElementById("notifDropdown");
    if (drop) drop.style.display = "none";
}
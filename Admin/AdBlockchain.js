const web3 = new Web3("http://127.0.0.1:7545"); 

// --- GLOBAL STATE ---
let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;
let currentNotifTab = 'all';

let allBcLogs = [];         
let filteredBcLogs = [];    
let currentBcPage = 1;
const logsPerPage = 6; 

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("blockchain-wrapper");
    if (wrapper) setTimeout(() => wrapper.classList.add("fade-in"), 100);

    fetchBlockchainLogs();
    
    // Notifications Initialization
    updateNotifBadge();
    checkNotifications();
    setInterval(checkNotifications, 20000); 

    // --- SEARCH LISTENER ---
    const searchInput = document.getElementById('bcSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleBcSearch);
    }

    // --- PAGINATION LISTENERS ---
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentBcPage > 1) {
            currentBcPage--;
            renderBcTable();
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBcLogs.length / logsPerPage);
        if (currentBcPage < totalPages) {
            currentBcPage++;
            renderBcTable();
        }
    });

    // --- NOTIFICATION LISTENERS ---
    document.getElementById('notifBell')?.addEventListener('click', toggleNotifs);
    document.getElementById('clearNotifsBtn')?.addEventListener('click', clearAllNotifs);
    document.getElementById('tabAll')?.addEventListener('click', (e) => { e.stopPropagation(); switchTab('all'); });
    document.getElementById('tabUnread')?.addEventListener('click', (e) => { e.stopPropagation(); switchTab('unread'); });
});

// --- BLOCKCHAIN LOGIC ---

async function fetchBlockchainLogs() {
    try {
        const response = await fetch('/api/admin/audit_logs');
        const rawLogs = await response.json();
        
        allBcLogs = rawLogs.filter(log => {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            return log.blockchain_tx || details.txHash || log.action.includes('RESOLVED');
        });

        handleBcSearch(); 
    } catch (err) {
        console.error("Blockchain Fetch Error:", err);
    }
}

function handleBcSearch() {
    const query = document.getElementById('bcSearch')?.value.toLowerCase() || "";
    
    filteredBcLogs = allBcLogs.filter(log => {
        const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        const txHash = (details.txHash || log.blockchain_tx || "").toLowerCase();
        const action = log.action.toLowerCase();
        return txHash.includes(query) || action.includes(query);
    });

    currentBcPage = 1; 
    renderBcTable();
}

function renderBcTable() {
    const container = document.getElementById('blockchain-log-body');
    const pageInfo = document.getElementById('pageInfo');
    if (!container) return;

    // --- PAGINATION LOGIC ---
    const totalPages = Math.ceil(filteredBcLogs.length / logsPerPage) || 1;
    const paginatedItems = filteredBcLogs.slice((currentBcPage - 1) * logsPerPage, currentBcPage * logsPerPage);

    if (pageInfo) pageInfo.innerText = `Page ${currentBcPage} of ${totalPages}`;

    // --- TABLE GENERATION ---
    container.innerHTML = paginatedItems.map(log => {
        const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        
        // --- DATA MAPPING ---
        const txHash = log.blockchain_tx || details.txHash || "Processing...";
        const maskedItem = details.itemId ? `ID: ${details.itemId}` : "N/A";
        const realGas = (log.gas_used && log.gas_used !== "0") ? log.gas_used : (details.gasUsed || "Pending...");
        const shortHash = txHash !== "Processing..." ? `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 6)}` : txHash;

        // --- ROW TEMPLATE ---
        return `
            <tr>
                <td>
                    <strong>${new Date(log.created_at).toLocaleDateString()}</strong><br>
                    <small style="color:#666;">${new Date(log.created_at).toLocaleTimeString()}</small>
                </td>
                <td><span class="log-badge badge-admin">${log.action.replace(/_/g, ' ')}</span></td>
                <td><code class="hash-code" title="${txHash}">${shortHash}</code></td>
                <td><em>${maskedItem}</em></td>
                <td style="font-weight: bold; color: #2e7d32;">
                    ${realGas.toLocaleString()} 
                </td>
                <td>
                    <span class="status-badge status-verified">
                        <i class="fa-solid fa-shield-check"></i> Verified
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// --- NOTIFICATION LOGIC ---

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
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    const unreadCount = notifications.filter(n => !n.read).length;
    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? "block" : "none";
}

function switchTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll').classList.toggle('active', type === 'all');
    document.getElementById('tabUnread').classList.toggle('active', type === 'unread');
    renderNotifDropdown();
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

    let displayList = currentNotifTab === 'unread' 
        ? notifications.filter(n => !n.read) 
        : notifications;

    if (displayList.length === 0) {
        list.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #999; font-size: 0.85rem;">No notifications</div>`;
        return;
    }

    list.innerHTML = displayList.map(n => {
        const globalIndex = notifications.indexOf(n);
        return `
        <div class="notif-item-modern ${n.read ? '' : 'unread-bg'}" onclick="handleNotifClick(${globalIndex})">
            <div class="notif-icon-circle" style="background:#7aa340; width:35px; height:35px; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <i class="fa-solid fa-link" style="font-size:0.8rem;"></i>
            </div>
            <div style="flex-grow:1;">
                <div style="font-size:0.85rem; color:#1c1e21; font-weight:${n.read ? '400' : '600'}">${n.text}</div>
                <div style="font-size:0.75rem; color:#65676b;">${n.time}</div>
            </div>
            ${!n.read ? '<div class="unread-dot-small" style="width:8px; height:8px; background:#7aa340; border-radius:50%;"></div>' : ''}
        </div>`;
    }).join('');
}

function handleNotifClick(index) {
    notifications[index].read = true;
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    window.location.href = 'AdReport.html';
}

function clearAllNotifs() {
    notifications = [];
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    document.getElementById("notifDropdown").style.display = "none";
}
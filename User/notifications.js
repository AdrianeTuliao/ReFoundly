// --- GLOBAL USER NOTIFICATION ENGINE ---
let currentNotifTab = 'all';

// 1. Toast Storage & State Setup
if (!window.shownToastIds) {
    window.shownToastIds = new Set(JSON.parse(sessionStorage.getItem('shownNotifToasts') || '[]'));
}

// 2. Global ReFoundly Toast Function
function showRefoundlyToast(title, message, iconClass = 'fa-solid fa-bell') {
    let container = document.getElementById('refoundly-toast-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'refoundly-toast-container';
        container.className = 'refoundly-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'refoundly-toast';
    toast.innerHTML = `
        <div class="refoundly-toast-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="refoundly-toast-content">
            <h4 class="refoundly-toast-title">${title}</h4>
            <p class="refoundly-toast-body">${message}</p>
        </div>
        <button class="refoundly-toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// 3. Match Popup Checker
function checkAndShowMatchPopups(notifications) {
    if (!Array.isArray(notifications)) return;

    const unreadNotifs = notifications.filter(n => n.is_read == 0 || n.is_read === false || n.read === false);

    unreadNotifs.forEach(n => {
        if (!window.shownToastIds.has(n.id)) {
            showRefoundlyToast(
                "Bagong Notification!",
                n.message || n.text || "May bagong update sa ReFoundly account mo.",
                "fa-solid fa-bell"
            );

            window.shownToastIds.add(n.id);
            sessionStorage.setItem('shownNotifToasts', JSON.stringify([...window.shownToastIds]));
        }
    });
}

// 4. Update Notifications UI
async function updateNotificationsUI() {
    const list = document.getElementById("notifList");
    const badge = document.getElementById("notifBadge");
    
    try {
        const res = await fetch('/api/user/notifications');
        if (!res.ok) return;
        
        const data = await res.json();

        // Mag-trigger ng Popup Toast Alert kung may unread notif
        if (Array.isArray(data)) {
            checkAndShowMatchPopups(data);
        }

        // Check unread status
        const unreadCount = data.filter(n => n.is_read == 0 || n.is_read === false || n.read === false).length;
        
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? "flex" : "none";
        }

        if (!list) return;

        let displayList = currentNotifTab === 'unread' 
            ? data.filter(n => n.is_read == 0 || n.is_read === false || n.read === false) 
            : data;

        if (displayList.length === 0) {
            list.innerHTML = `<div class="notif-empty" style="padding:20px; text-align:center; color:#65676b;">No ${currentNotifTab === 'unread' ? 'unread' : ''} notifications</div>`;
            return;
        }

        list.innerHTML = displayList.map(n => {
            const isRead = n.is_read == 1 || n.is_read === true || n.read === true;
            const date = n.created_at 
                ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recent';

            return `
                <div class="notif-item-modern ${isRead ? '' : 'unread-bg'}" onclick="handleGlobalNotifClick(${n.id})">
                    <div class="notif-icon-circle" style="background: ${isRead ? '#f0f2f5' : '#7aa340'}; width:35px; height:35px; border-radius:50%; color:${isRead ? '#65676b' : 'white'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fa-solid fa-bell" style="font-size:0.8rem;"></i>
                    </div>
                    <div style="flex-grow:1;">
                        <div style="font-size:0.85rem; color:#1c1e21; font-weight:${isRead ? '400' : '700'}">${n.message || n.text}</div>
                        <div style="font-size:0.75rem; color:#65676b;">${date}</div>
                    </div>
                    ${!isRead ? '<div class="unread-dot-small" style="width:8px; height:8px; background:#7aa340; border-radius:50%;"></div>' : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Notification Load Error:", err);
    }
}

// 5. Click & Tab Helpers
async function handleGlobalNotifClick(id) {
    try {
        await fetch(`/api/user/notifications/read/${id}`, { method: 'POST' });
        await updateNotificationsUI(); 
        window.location.href = 'history.html'; 
    } catch (err) {
        console.error("Could not mark notification as read", err);
        window.location.href = 'history.html';
    }
}

function switchNotifTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll')?.classList.toggle('active', type === 'all');
    document.getElementById('tabUnread')?.classList.toggle('active', type === 'unread');
    updateNotificationsUI();
}

function initNotifications() {
    const bell = document.getElementById('notifBell');
    const dropdown = document.getElementById('notifDropdown');
    const tabAll = document.getElementById('tabAll');
    const tabUnread = document.getElementById('tabUnread');

    if (bell && dropdown) {
        dropdown.style.display = "none";

        bell.onclick = (e) => {
            e.stopPropagation();
            const isOpening = dropdown.style.display === "none" || dropdown.style.display === "";
            dropdown.style.display = isOpening ? "flex" : "none";
            if (isOpening) updateNotificationsUI();
        };

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== bell) {
                dropdown.style.display = "none";
            }
        });
    }

    tabAll?.addEventListener('click', (e) => { e.stopPropagation(); switchNotifTab('all'); });
    tabUnread?.addEventListener('click', (e) => { e.stopPropagation(); switchNotifTab('unread'); });
    
    updateNotificationsUI();
}

document.addEventListener("DOMContentLoaded", initNotifications);
setInterval(updateNotificationsUI, 20000);
(() => {
    let allItems = []; 
    let filteredItems = []; 
    let currentPage = 1;
    const itemsPerPage = 3; 
    let currentNotifTab = 'all';

// 1. Setup Dropdown Search Logic
function setupSearch(inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!input || !list) return;

    const items = list.querySelectorAll('li');

    input.addEventListener('keyup', function() {
        let filter = this.value.toLowerCase();
        list.style.display = 'block'; 
        items.forEach(item => {
            let text = item.textContent.toLowerCase();
            item.style.display = text.includes(filter) ? "block" : "none";
        });
    });

    items.forEach(item => {
        item.addEventListener('click', function() {
            input.value = this.textContent;
            list.style.display = 'none'; 
        });
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) list.style.display = 'none';
    });
    
    input.addEventListener('focus', () => list.style.display = 'block');
}

// 2. Load Data from API
async function loadPublishedItems() {
    try {
        const response = await fetch('/api/items/published');
        if (response.status === 401) return; 
        allItems = await response.json(); 
        filteredItems = [...allItems]; 
        renderPage(1); 
    } catch (error) {
        console.error("Error loading items:", error);
        const grid = document.querySelector(".grid");
        if(grid) grid.innerHTML = "<p>Error connecting to the server.</p>";
    }
}

// 3. Filter Logic
function applyFilters() {
    const category = document.getElementById('categoryInput').value.toLowerCase().trim();
    const location = document.getElementById('locationInput').value.toLowerCase().trim();
    const nameSearch = document.querySelector('.search-group input[placeholder="Search item name..."]')?.value.toLowerCase().trim() || "";

    filteredItems = allItems.filter(item => {
        // Kapag walang nilagay, O KAYA piliin ang "all" / "all categories", i-bypass ang filter
        const matchCategory = !category || category === 'all' || category === 'all categories' || item.category.toLowerCase().includes(category);
        
        // Kapag walang nilagay, O KAYA piliin ang "all" / "all barangays", i-bypass ang filter
        const matchLocation = !location || location === 'all' || location === 'all barangays' || item.location.toLowerCase().includes(location);
        
        const matchName = !nameSearch || item.item_name.toLowerCase().includes(nameSearch);
        
        return matchCategory && matchLocation && matchName;
    });

    currentPage = 1; 
    renderPage(1);
}

// 4. Render Grid (CSP SECURE VERSION)
function renderPage(page) {
    const grid = document.querySelector(".grid");
    if(!grid) return;
    grid.innerHTML = ""; 

    if (filteredItems.length === 0) {
        grid.innerHTML = "<div style='grid-column: 1/-1; text-align:center; padding: 20px;'><h3>No items found.</h3></div>";
        updatePaginationUI();
        return;
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    paginatedItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";

        const tempDiv = document.createElement('div');
        tempDiv.textContent = item.item_name; 
        const safeItemName = tempDiv.innerHTML; 

        const imageHtml = item.image_path 
            ? `<img src="${item.image_path}" alt="Item" style="width:100%; height:200px; object-fit:cover;">`
            : `<div class="card-img" style="height:200px; display:flex; align-items:center; justify-content:center; background:#eee;">No Image</div>`;

        const dbType = (item.report_type || item.type || "").toLowerCase().trim();

        card.innerHTML = `
            ${imageHtml}
            <div class="card-body">
                <h4>${safeItemName}</h4> 
                <span class="badge" style="background:#D97706; color:white; padding:2px 8px; border-radius:4px;">${item.category}</span>
                <p style="font-size: 12px; color: #999; margin-top:10px;">Posted: ${item.formattedDate || 'Recent'}</p>
                <button class="btn-main2 view-details-btn" style="width:100%; margin-top:15px; cursor: pointer;">View Details</button>
            </div>
        `;

        card.querySelector('.view-details-btn').addEventListener('click', () => {
            finalRedirect(item.id, dbType);
        });

        grid.appendChild(card);
    });

    updatePaginationUI();
}

// 5. Updated Notification Logic (Admin-Style)
async function updateNotificationsUI() {
    const list = document.getElementById("notifList");
    const badge = document.getElementById("notifBadge");
    if (!list) return;

    try {
        const res = await fetch('/api/user/notifications');

        // 1. Check if the HTTP response is OK (prevents JSON syntax errors on HTML 404/500 responses)
        if (!res.ok) {
            console.warn(`Notifications fetch failed with status: ${res.status}`);
            return;
        }

        const data = await res.json();

        // 2. Validate that data is an array before processing
        if (!Array.isArray(data)) {
            console.error("Notifications response was not an array:", data);
            return;
        }

        // Update Badge Count (Unread only)
        const unreadCount = data.filter(n => !n.is_read).length;
        if (badge) {
            badge.innerText = unreadCount;
            // Use 'flex' so the centering CSS works, 'none' to hide if 0
            badge.style.display = unreadCount > 0 ? "flex" : "none";
        }

        // Filter list based on active tab
        let displayList = currentNotifTab === 'unread' ? data.filter(n => !n.is_read) : data;

        if (displayList.length === 0) {
            list.innerHTML = `<div style="padding: 40px 20px; text-align: center; color: #999; font-size: 0.85rem;">
                No ${currentNotifTab === 'unread' ? 'unread' : ''} notifications
            </div>`;
            return;
        }

        list.innerHTML = displayList.map(n => {
            const date = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // 3. Escape the message content to prevent potential XSS issues
            const safeMessage = (n.message || "Notification updated")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            return `
                <div class="notif-item-modern ${n.is_read ? '' : 'unread-bg'}" onclick="handleNotifClick(${n.id})">
                    <div class="notif-icon-circle" style="background: #7aa340; width:35px; height:35px; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fa-solid fa-bell" style="font-size:0.8rem;"></i>
                    </div>
                    <div style="flex-grow:1;">
                        <div style="font-size:0.85rem; color:#1c1e21; font-weight:${n.is_read ? '600' : '700'}">${safeMessage}</div>
                        <div style="font-size:0.75rem; color:#65676b;">${date}</div>
                    </div>
                    ${!n.is_read ? '<div class="unread-dot-small"></div>' : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Notification Load Error:", err);
    }
}

function switchNotifTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll')?.classList.toggle('active', type === 'all');
    document.getElementById('tabUnread')?.classList.toggle('active', type === 'unread');
    updateNotificationsUI();
}

async function handleNotifClick(id) {
    await fetch(`/api/user/notifications/read/${id}`, { method: 'POST' });
    window.location.href = 'history.html'; 
}



// 6. Navigation & UI Helpers
window.finalRedirect = function(id, type) {
    const verifiedType = String(type || "").toLowerCase().trim();
    if (verifiedType === "lost") {
        window.location.href = "lost.html?open=" + id;
    } else {
        window.location.href = "found.html?open=" + id;
    }
};

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const pageInfo = document.getElementById("pageInfo");
    if(pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    
    if(prevBtn) {
        prevBtn.disabled = (currentPage === 1);
        prevBtn.style.opacity = (currentPage === 1) ? "0.5" : "1";
    }
    if(nextBtn) {
        nextBtn.disabled = (currentPage >= totalPages || totalPages === 0);
        nextBtn.style.opacity = (nextBtn.disabled) ? "0.5" : "1";
    }
}

function checkSession() {
    fetch('/user/me', { headers: { 'Accept': 'application/json' } })
    .then(response => {
        if (response.status === 401) {
            const modal = document.getElementById('session-alert');
            if (modal) modal.style.setProperty('display', 'flex', 'important');
            const grid = document.querySelector(".grid");
            if (grid) grid.innerHTML = "<h3>Session Expired. Please log in.</h3>";
        }
    })
    .catch(() => console.warn("Server connection offline."));
}

document.addEventListener("DOMContentLoaded", () => {
    // --- DROPDOWNS & DATA ---
    // Only call setupSearch if the inputs exist (prevents errors on different pages)
    if (document.getElementById('categoryInput')) setupSearch('categoryInput', 'categoryList');
    if (document.getElementById('locationInput')) setupSearch('locationInput', 'locationList');
    
    // Load page-specific items
    if (typeof loadPublishedItems === 'function') loadPublishedItems(); 
    if (typeof loadFoundItems === 'function') loadFoundItems();

    // --- NOTIFICATION INITIALIZATION ---
    const bell = document.getElementById('notifBell');
    const dropdown = document.getElementById('notifDropdown');
    const markReadBtn = document.getElementById('markAllRead');

    // CRITICAL: Explicitly hide dropdown on load to prevent auto-opening
    if (dropdown) dropdown.style.display = "none";
    
    updateNotificationsUI(); // Initial count/load

    // Toggle Dropdown
    bell?.addEventListener('click', (e) => {
        e.stopPropagation();
        // Check if it's currently hidden
        const isHidden = dropdown.style.display === "none";
        dropdown.style.display = isHidden ? "flex" : "none"; 
        
        // Refresh data only when opening
        if (isHidden) updateNotificationsUI();
    });

    // Tab Listeners (Using your existing switchNotifTab function)
    document.getElementById('tabAll')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof switchNotifTab === 'function') {
            switchNotifTab('all');
        } else {
            // Fallback if switchNotifTab isn't global
            currentNotifTab = 'all';
            document.getElementById('tabAll').classList.add('active');
            document.getElementById('tabUnread').classList.remove('active');
            updateNotificationsUI();
        }
    });

    document.getElementById('tabUnread')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof switchNotifTab === 'function') {
            switchNotifTab('unread');
        } else {
            currentNotifTab = 'unread';
            document.getElementById('tabUnread').classList.add('active');
            document.getElementById('tabAll').classList.remove('active');
            updateNotificationsUI();
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.contains(e.target) && e.target !== bell) {
            dropdown.style.display = "none";
        }
    });

    // Mark All as Read
    markReadBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            const res = await fetch('/api/user/notifications/read-all', { method: 'POST' });
            if (res.ok) updateNotificationsUI();
        } catch (err) {
            console.error("Error marking read:", err);
        }
    });

    // --- OTHER LISTENERS ---
    // Pagination, Search, and Session checks...
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    prevBtn?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage ? renderPage(currentPage) : updateView();
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    nextBtn?.addEventListener("click", () => {
        const totalItems = filteredItems ? filteredItems.length : allItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage ? renderPage(currentPage) : updateView();
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    const searchBtn = document.querySelector('.search-container .btn-main1');
    if (searchBtn) searchBtn.addEventListener('click', applyFilters);

    document.getElementById('retry-login-btn')?.addEventListener('click', () => {
        window.location.href = '/index.html';
    });

    setInterval(checkSession, 60000);
});

})();
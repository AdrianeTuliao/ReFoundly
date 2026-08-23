// --- GLOBAL STATE ---
let itemsData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 6;
let currentNotifTab = 'all';

let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".content-wrapper");
    if (wrapper) setTimeout(() => wrapper.classList.add("fade-in"), 100);

    // Attach Listeners to Static Elements
    document.getElementById("statusFilter")?.addEventListener("change", filterTable);
    document.getElementById("searchInput")?.addEventListener("input", filterTable);
    document.getElementById("prevBtn")?.addEventListener("click", () => changePage(-1));
    document.getElementById("nextBtn")?.addEventListener("click", () => changePage(1));
    document.getElementById("closeItemModal")?.addEventListener("click", closeModal);
    document.getElementById("confirmCancel")?.addEventListener("click", closeConfirmModal);
    document.getElementById("notifBell")?.addEventListener("click", toggleNotifs);
    document.getElementById("clearNotifsBtn")?.addEventListener("click", clearAllNotifs);
    document.getElementById('tabAll')?.addEventListener('click', (e) => { e.stopPropagation(); switchTab('all'); });
    document.getElementById('tabUnread')?.addEventListener('click', (e) => { e.stopPropagation(); switchTab('unread'); });

    // Modal backdrop click
    window.addEventListener("click", (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal();
            closeConfirmModal();
        }
    });

    fetchItems().then(() => {
        checkUrlForHighlight();
    });

    updateNotifBadge();
});

function switchTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll')?.classList.toggle('active', type === 'all');
    document.getElementById('tabUnread')?.classList.toggle('active', type === 'unread');
    renderNotifDropdown();
}

// API FUNCTIONS
async function fetchItems() {
    try {
        const response = await fetch('/api/admin/items');
        
        if (response.status === 401 || response.redirected) {
            window.location.href = "AdLogin.html";
            return;
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const freshData = await response.json();

        // 1. Safe filter para hindi ma-trap ang mga ni-restore
        const activeOnlyData = processAutoArchive(freshData);

        activeOnlyData.forEach(item => {
            if (!knownItemIds.has(item.id)) {
                if (!isInitialLoad || item.status === "Pending Approval") {
                    addNotif(`New Report: ${item.item_name}`, item.id);
                }
                knownItemIds.add(item.id);
            }
        });

        localStorage.setItem('refoundly_known_ids', JSON.stringify([...knownItemIds]));
        isInitialLoad = false;
        
        // 2. Assign filtered active items to state
        itemsData = activeOnlyData;
        filteredData = [...itemsData];
        
        renderTable();
        updateCounts();
    } catch (error) {
        console.error("Error loading items:", error);
    }
}

setInterval(fetchItems, 20000);

async function changeStatus(id, newStatus) {
    try {
        const response = await fetch('/api/admin/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                itemId: id, 
                newStatus: newStatus
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Success: ${result.message}`);
            fetchItems(); 
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("❌ Request Failed:", error);
    }
}

// UI RENDERING
function renderTable() {
    const tbody = document.getElementById("reportsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredData.slice(start, end);

    if (pageItems.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No reports found.</td></tr>";
    } else {
        pageItems.forEach(item => {
            const statusText = item.status || "Pending Approval";
            const statusClass = statusText.toLowerCase().replace(/\s+/g, '-');
            const displayDate = item.formattedDate || item.incident_date || "N/A";
            const reporterName = `${item.contact_firstname} ${item.contact_lastname}`;

            const tr = document.createElement("tr");
            tr.setAttribute("data-id", item.id);
            tr.innerHTML = `
                <td>${item.item_name || "Unknown"}</td>
                <td><strong>${reporterName}</strong></td>
                <td>${item.category || "General"}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${displayDate}</td>
                <td class="action-cell"></td>`;

            const actionCell = tr.querySelector('.action-cell');

            actionCell.appendChild(createButton("Details", "btn-view", () => showDetails(item.id)));

            if (statusText === "Pending Approval") {
                actionCell.appendChild(createButton("Approve", "btn-approve", () => confirmStatusChange(item.id, 'Published')));
                actionCell.appendChild(createButton("Deny", "btn-deny", () => confirmStatusChange(item.id, 'Denied')));
            } else if (statusText === "Published") {
                actionCell.appendChild(createButton("Mark Resolved", "btn-resolve", () => confirmStatusChange(item.id, 'Resolved')));
            }
            actionCell.appendChild(createButton("Archive", "btn-archive-sm", () => openArchiveModal(item)));

            tbody.appendChild(tr);
        });
    }
    updatePaginationUI();
}

function createButton(text, className, callback) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = text;
    btn.addEventListener('click', callback);
    return btn;
}

// MODAL LOGIC
function showDetails(id) {
    const item = itemsData.find(i => i.id === id);
    if (!item) return;

    document.getElementById("modalItemName").innerText = item.item_name;
    const imageSource = item.image_path || 'placeholder.jpg';

    document.getElementById("modalBody").innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="${imageSource}" id="modalImg" style="max-width: 100%; max-height: 250px; border-radius: 8px;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem; color: #444;">
            <div><strong>Type:</strong> ${item.report_type || 'N/A'}</div>
            <div><strong>Posted By:</strong> ${item.contact_firstname} ${item.contact_lastname}</div>
            <div><strong>Category:</strong> ${item.category}</div>
            <div><strong>Phone:</strong> ${item.contact_phone || 'N/A'}</div>
            <div><strong>Brand:</strong> ${item.brand || 'N/A'}</div>
            <div><strong>Location:</strong> ${item.location || 'N/A'}</div>
        </div>
        <div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-left: 4px solid #5D8252;">
            <strong>Description:</strong>
            <p style="margin-top: 5px; font-size: 0.85rem;">${item.description || 'No description provided.'}</p>
        </div>`;
    
    document.getElementById("modalImg").onerror = function() { this.src = 'placeholder.jpg'; };
    document.getElementById("itemModal").style.display = "block";
}

function confirmStatusChange(id, newStatus) {
    const modal = document.getElementById("confirmModal");
    const header = document.getElementById("confirmHeader");
    const title = document.getElementById("confirmTitle");
    const msg = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYes");
    const item = itemsData.find(i => String(i.id) === String(id));

    if (!item) {
        console.error(`Item ID ${id} not found. Try refreshing the page.`);
        return;
    }

    const config = {
        'Published': { color: "#5D8252", title: "Approve Item", verb: "Approve" },
        'Denied':    { color: "#dc3545", title: "Deny Item",    verb: "Deny" },
        'Resolved':  { color: "#17a2b8", title: "Mark Resolved", verb: "Resolve" },
        'Archived':  { color: "#6c757d", title: "Archive Item",  verb: "Are you sure you want to archive" }
    };

    const settings = config[newStatus] || config['Resolved'];

    header.style.backgroundColor = settings.color;
    title.innerText = settings.title;
    msg.innerText = `${settings.verb} "${item.item_name}"?`;
    yesBtn.style.backgroundColor = settings.color;

    modal.style.display = "block";

    const newYesBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    
    newYesBtn.addEventListener('click', () => {
        if (newStatus === 'Archived') {
            manualArchiveItem(id);
        } else {
            changeStatus(id, newStatus);
        }
        closeConfirmModal();
    });
}

function closeModal() { document.getElementById("itemModal").style.display = "none"; }
function closeConfirmModal() { document.getElementById("confirmModal").style.display = "none"; }

// FILTER & NOTIFICATION LOGIC
function filterTable() {
    const statusFilter = document.getElementById("statusFilter").value;
    const searchInput = document.getElementById("searchInput").value.toLowerCase();
    
    filteredData = itemsData.filter(item => {
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const reporterName = `${item.contact_firstname} ${item.contact_lastname}`.toLowerCase();
        const searchPool = [item.item_name, item.category, item.status, reporterName, item.location].join(' ').toLowerCase();
        return matchesStatus && searchPool.includes(searchInput);
    });

    currentPage = 1;
    renderTable();
}

function updatePaginationUI() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    document.getElementById("pageDisplay").innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prevBtn").disabled = currentPage === 1;
    document.getElementById("nextBtn").disabled = currentPage === totalPages;
}

function changePage(step) {
    currentPage += step;
    renderTable();
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
    const itemId = notifications[index].itemId;
    notifications[index].read = true;
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    
    document.getElementById("notifDropdown").style.display = "none";
    showDetails(itemId);
}

function clearAllNotifs() {
    notifications = [];
    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
    updateNotifBadge();
    document.getElementById("notifDropdown").style.display = "none";
}

function updateCounts() {
    const pending = itemsData.filter(i => i.status === "Pending Approval").length;
    const resolved = itemsData.filter(i => i.status === "Resolved").length;
    const active = itemsData.filter(i => i.status === "Published").length;
    
    const pendElem = document.getElementById("pending-count");
    if(pendElem) pendElem.innerText = pending;
    
    const activeElem = document.getElementById("active-count");
    if(activeElem) activeElem.innerText = active;

    const resElem = document.getElementById("resolved-count");
    if(resElem) resElem.innerText = resolved;
}

function checkUrlForHighlight() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('id');

    if (targetId) {
        setTimeout(() => {
            const targetRow = document.querySelector(`tr[data-id="${targetId}"]`);
            if (targetRow) {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetRow.classList.add('highlight-glow');
                showDetails(Number(targetId));
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 300);
    }
}

// --- SAFE ARCHIVE FILTER (Inalis ang loop para hindi ma-trap ang restore) ---
function processAutoArchive(itemsList) {
    // I-filter lamang ang mga hindi naka-archive base sa database flag (is_archived)
    return itemsList.filter(item => !item.is_archived);
}

// --- MANUAL ARCHIVE FUNCTION ---
function manualArchiveItem(id) {
    const itemIndex = itemsData.findIndex(i => i.id === id);
    if (itemIndex === -1) return;

    const [itemToArchive] = itemsData.splice(itemIndex, 1);
    itemToArchive.archivedDate = new Date().toLocaleDateString();

    let currentArchives = JSON.parse(localStorage.getItem('refoundly_archived_items')) || [];
    currentArchives.push(itemToArchive);
    localStorage.setItem('refoundly_archived_items', JSON.stringify(currentArchives));

    filteredData = filteredData.filter(i => i.id !== id);
    renderTable();
    updateCounts();
}

// --- MANUAL ARCHIVE WITH MODAL LOGIC (Ginagamit ang .onclick para iwas stacking) ---
function openArchiveModal(item) {
    const modal = document.getElementById("itemModal"); 
    const modalBody = document.getElementById("modalBody");
    const reporterName = `${item.contact_firstname || ''} ${item.contact_lastname || ''}`.trim() || "N/A";
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; font-size: 15px; color: #444;">
            <p style="margin: 8px 0;"><strong>Item Name:</strong> ${item.item_name || "Unknown"}</p>
            <p style="margin: 8px 0;"><strong>Category:</strong> ${item.category || "General"}</p>
            <p style="margin: 8px 0;"><strong>Reporter:</strong> ${reporterName}</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> <span class="badge ${item.status.toLowerCase().replace(/\s+/g, '-')}">${item.status}</span></p>
            <p style="margin: 8px 0;"><strong>Description:</strong> ${item.description || "No description provided."}</p>
        </div>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 15px;">
            <p style="margin: 0; font-size: 0.9rem; color: #666;">Are you sure you want to manually archive this item?</p>
            <button id="confirmArchiveBtn" class="btn-archive" style="background-color: #6a994e; color: #fff;">Yes, Archive</button>
        </div>
    `;
    
    modal.style.display = "block"; 

    document.getElementById("confirmArchiveBtn").onclick = () => {
        executeArchive(item);
    };

    document.getElementById("closeItemModal").onclick = function() {
        modal.style.display = "none";
    }
}

function executeArchive(item) {
    fetch(`/api/items/${item.id}/archive`, {
        method: 'PUT'
    })
    .then(response => response.json())
    .then(data => {
        let archived = JSON.parse(localStorage.getItem('refoundly_archived_items')) || [];
        item.archivedDate = new Date().toLocaleDateString();
        archived.push(item);
        localStorage.setItem('refoundly_archived_items', JSON.stringify(archived));

        document.getElementById("itemModal").style.display = "none";
        location.reload(); 
    })
    .catch(error => console.error('Error archiving item:', error));
}
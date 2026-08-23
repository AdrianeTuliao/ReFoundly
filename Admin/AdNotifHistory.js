let currentFilter = 'all'; 
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector('.content-wrapper');
    if (wrapper) wrapper.classList.add('fade-in');
    
    renderFullHistory();
});

function filterHistory(type) {
    currentFilter = type;
    currentPage = 1;
    document.getElementById('tabAll').classList.toggle('active', type === 'all');
    document.getElementById('tabUnread').classList.toggle('active', type === 'unread');
    renderFullHistory();
}

// Function to handle arrow clicks
function changePage(direction) {
    currentPage += direction;
    renderFullHistory();
}

function handleNotifClick(id, targetUrl) {
    const notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
    const updated = notifications.map(n => {
        if (n.id === id) return { ...n, read: true };
        return n;
    });
    localStorage.setItem('refoundly_notifications', JSON.stringify(updated));
    window.location.href = targetUrl;
}

function renderFullHistory() {
    const listContainer = document.getElementById("fullHistoryList");
    const notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];

    let displayList = [...notifications].reverse();
    if (currentFilter === 'unread') {
        displayList = displayList.filter(n => !n.read);
    }

    // --- Pagination Logic ---
    const totalItems = displayList.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // Boundary checks
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    // Calculate slice indices
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = displayList.slice(startIndex, endIndex);

    // Update Pagination UI Elements
    const pageDisplay = document.getElementById('pageDisplay');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const paginationControls = document.querySelector('.pagination-controls');

    if (pageDisplay) pageDisplay.innerText = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;

    if (totalItems === 0) {
        if (paginationControls) paginationControls.style.display = 'none';
        listContainer.innerHTML = `
            <div style="padding: 60px 20px; text-align: center; color: #8a8d91;">
                <i class="fa-regular fa-bell-slash" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                No ${currentFilter === 'unread' ? 'unread' : ''} notifications found.
            </div>`;
        return;
    } else {
        if (paginationControls) paginationControls.style.display = 'flex';
    }

    listContainer.innerHTML = paginatedItems.map(n => {
        const targetUrl = n.reportId ? `AdReport.html?id=${n.reportId}` : 'AdReport.html';
        const iconBg = n.read ? '#e4e6eb' : '#7aa340';
        const iconColor = n.read ? '#65676b' : 'white';
        const fontWeight = n.read ? '400' : '600';

        return `
            <div class="notif-row" onclick="handleNotifClick(${n.id}, '${targetUrl}')">
                <div class="notif-icon-circle" style="background: ${iconBg}; color: ${iconColor};">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-text" style="font-weight: ${fontWeight}">${n.text}</div>
                    <div class="notif-time">${n.time}</div>
                </div>
                ${!n.read ? '<div class="unread-dot" style="width: 10px; height: 10px; background: #7aa340; border-radius: 50%;"></div>' : ''}
            </div>
        `;
    }).join('');
}

function clearLocalStorageHistory() {
    if(confirm("Are you sure you want to delete all notification history?")) {
        localStorage.removeItem('refoundly_notifications');
        currentPage = 1; // Reset to first page
        renderFullHistory();
    }
}
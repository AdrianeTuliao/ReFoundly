// --- GLOBAL STATE ---
let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;
let currentNotifTab = 'all';

let rawAnalyticsData = [];
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".content-wrapper");

    // Force visible state immediately
    if (wrapper) {
        wrapper.style.opacity = "1";
        wrapper.style.display = "block";
    }

    if (typeof fetchAdminProfile === 'function') {
        fetchAdminProfile();
    }

    // Attach Listeners safely
    document.getElementById('notifBell')?.addEventListener('click', toggleNotifs);
    document.getElementById('clearNotifsBtn')?.addEventListener('click', clearAllNotifs);
    document.getElementById('tabAll')?.addEventListener('click', (e) => { e.stopPropagation(); switchTab('all'); });
    document.getElementById('tabUnread')?.addEventListener('click', (e) => { e.stopPropagation(); switchTab('unread'); });

    // Filter Change Listeners
    document.getElementById('categoryFilter')?.addEventListener('change', applyFilters);
    document.getElementById('timeFilter')?.addEventListener('change', applyFilters);

    // Page Navigation Handling
    const navLinks = document.querySelectorAll('.sidebar nav a, .sidebar-footer a, .avatar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.hostname === window.location.hostname && !link.hash) {
                e.preventDefault();
                const nextURL = link.href;
                window.location.href = nextURL;
            }
        });
    });

    // Initialize Page Data
    updateNotifBadge();
    checkNotifications(); 
    setInterval(checkNotifications, 20000);
    
    // Load Analytics Data
    fetchAnalyticsData();
});

// --- ANALYTICS ENGINE & CHARTS ---
async function fetchAnalyticsData() {
    try {
        const response = await fetch('/api/admin/items');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        rawAnalyticsData = await response.json();
        applyFilters();
    } catch (err) {
        console.error("Failed to load analytics data:", err);
    }
}

function applyFilters() {
    if (!rawAnalyticsData || rawAnalyticsData.length === 0) return;

    const selectedCategory = document.getElementById('categoryFilter')?.value || 'all';
    const selectedTime = document.getElementById('timeFilter')?.value || '30';

    const now = new Date();

    const filteredData = rawAnalyticsData.filter(item => {
        // Category Filter
        const itemCategory = (item.category || '').toLowerCase();
        const matchesCategory = selectedCategory === 'all' || itemCategory === selectedCategory.toLowerCase();

        // Time Range Filter
        let matchesTime = true;
        if (item.incident_date || item.created_at || item.formattedDate) {
            const itemDate = new Date(item.incident_date || item.created_at || item.formattedDate);
            if (!isNaN(itemDate.getTime())) {
                const diffTime = Math.abs(now - itemDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (selectedTime === '30') {
                    matchesTime = diffDays <= 30;
                } else if (selectedTime === '90') {
                    matchesTime = diffDays <= 90;
                } else if (selectedTime === 'all') {
                    matchesTime = itemDate.getFullYear() === now.getFullYear();
                }
            }
        }

        return matchesCategory && matchesTime;
    });

    renderCharts(filteredData);
}

function renderCharts(items) {
    const categories = {};
    const locations = {};
    const monthlyTrends = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let resolvedCount = 0;
    let pendingCount = 0;
    let publishedCount = 0;

    items.forEach(item => {
        // Category
        const rawCat = item.category || 'Others';
        const cat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase();
        categories[cat] = (categories[cat] || 0) + 1;

        // Location
        const loc = item.location || 'Unknown';
        locations[loc] = (locations[loc] || 0) + 1;

        // Status
        const status = item.status || 'Pending Approval';
        if (status === 'Resolved') resolvedCount++;
        else if (status === 'Pending Approval') pendingCount++;
        else if (status === 'Published') publishedCount++;

        // Monthly Trends
        const dateVal = item.incident_date || item.created_at || item.formattedDate;
        if (dateVal) {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                const month = monthNames[d.getMonth()];
                monthlyTrends[month] = (monthlyTrends[month] || 0) + 1;
            }
        }
    });

    // 1. Top Categories Vertical Bar Chart (FIXED SLIM BARS)
    createOrUpdateChart('barChart', 'bar', {
        labels: Object.keys(categories).length ? Object.keys(categories) : ['No Data'],
        datasets: [{
            label: 'Total Items',
            data: Object.keys(categories).length ? Object.values(categories) : [0],
            backgroundColor: '#7aa340',
            borderRadius: 8,
            barThickness: 32,
            maxBarThickness: 40
        }]
    });

    // 2. Loss Hotspots Horizontal Bar Chart (FIXED SLIM BARS & SOFT COLOR)
    const sortedLocations = Object.entries(locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

createOrUpdateChart('locationChart', 'bar', {
    labels: sortedLocations.length ? sortedLocations.map(l => l[0]) : ['No Data'],
    datasets: [{
        label: 'Reported Incidents',
        data: sortedLocations.length ? sortedLocations.map(l => l[1]) : [0],
        backgroundColor: '#a3b18a', // Earthy Sage Green kapalit ng Orange!
        borderRadius: 8,
        barThickness: 18,        // Mas manipis para hindi mataba
        maxBarThickness: 22
    }]
}, { indexAxis: 'y' });

    // 3. Monthly Activity Trends Line Chart
createOrUpdateChart('lineChart', 'line', {
    labels: monthNames,
    datasets: [{
        label: 'Activity',
        data: Object.values(monthlyTrends),
        borderColor: '#5D8252',
        backgroundColor: 'rgba(93, 130, 82, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#5D8252'
    }]
}, {
    layout: {
        padding: {
            bottom: 15 
        }
    }
});

    // 4. Resolution Success Rate Doughnut Chart
    createOrUpdateChart('pieChart', 'doughnut', {
        labels: ['Resolved', 'Pending', 'Published'],
        datasets: [{
            data: [resolvedCount, pendingCount, publishedCount],
            backgroundColor: ['#5D8252', '#facc15', '#0284c7'],
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    });
}

function createOrUpdateChart(canvasId, type, data, extraOptions = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: type === 'doughnut',
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { family: "'Public Sans', sans-serif", size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: type === 'doughnut' ? {} : {
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                }
            },
            ...extraOptions
        }
    });
}

// --- NOTIFICATION ENGINE ---
function switchTab(type) {
    currentNotifTab = type;
    document.getElementById('tabAll')?.classList.toggle('active', type === 'all');
    document.getElementById('tabUnread')?.classList.toggle('active', type === 'unread');
    renderNotifDropdown();
}

async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items');
        if (!response.ok) return;
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
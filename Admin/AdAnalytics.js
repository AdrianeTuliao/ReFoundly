// --- Global State ---
let notifications = JSON.parse(localStorage.getItem('refoundly_notifications')) || [];
let knownItemIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
let isInitialLoad = true;

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.querySelector(".content-wrapper");
    if (wrapper) {
        setTimeout(() => { wrapper.classList.add("fade-in"); }, 100);
    }
    
    // START LOAD with default filters
    loadCharts('all', '30');

    updateNotifBadge();
    checkNotifications(); 
    setInterval(checkNotifications, 20000);

    // Event Listeners
    const bell = document.getElementById('notifBell');
    const clearBtn = document.getElementById('clearNotifsBtn');

    if (bell) bell.addEventListener('click', toggleNotifs);
    if (clearBtn) clearBtn.addEventListener('click', clearAllNotifs);

    document.addEventListener('click', (e) => {
        const drop = document.getElementById("notifDropdown");
        if (drop && !drop.contains(e.target) && e.target !== bell) {
            drop.style.display = "none";
        }
    });
});

async function loadCharts(category = 'all', timeRange = '30') {
    try {
        const res = await fetch(`/api/admin/analytics?category=${category}&range=${timeRange}`);
        
        if (res.status === 401) {
            window.location.href = 'AdLogin.html';
            return;
        }

        const payload = await res.json();

        // --- CLEAR EXISTING CHARTS ---
        ['lineChart', 'barChart', 'pieChart', 'locationChart'].forEach(id => {
            const existingChart = Chart.getChart(id);
            if (existingChart) existingChart.destroy();
        });

        const monthly = payload.monthly || [];
        const categories = payload.categories || [];
        const locations = payload.locations || [];
        const style = getComputedStyle(document.documentElement);
        const colorPrimary = style.getPropertyValue('--chart-primary').trim() || '#6a994e';

        // --- 1. LINE CHART (MONTHLY TRENDS) ---
        const lineCtx = document.getElementById('lineChart');
        if (lineCtx && monthly.length > 0) {
            new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: monthly.map(row => row.month),
                    datasets: [{
                        label: 'Reports Filed',
                        data: monthly.map(row => Number(row.total)),
                        borderColor: colorPrimary,
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(106, 153, 78, 0.1)'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // --- 2. BAR CHART (TOP CATEGORIES - "ANO") ---
        const barCtx = document.getElementById('barChart');
        if (barCtx && categories.length > 0) {
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: categories.map(row => row.category),
                    datasets: [{
                        data: categories.map(row => Number(row.count)),
                        backgroundColor: colorPrimary
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // --- 3. PIE CHART (RESOLUTION RATE) ---
        const pieCtx = document.getElementById('pieChart');
        if (pieCtx && monthly.length > 0) {
            const totalResolved = monthly.reduce((sum, row) => sum + (Number(row.resolved) || 0), 0);
            const rawTotal = monthly.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
            const totalDenied = monthly.reduce((sum, row) => sum + (Number(row.denied) || 0), 0); 
            const actualPublished = Math.max(0, rawTotal - totalResolved - totalDenied);
            const validTotal = totalResolved + actualPublished; 

            new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Resolved', 'Published'], 
                    datasets: [{
                        data: [totalResolved, actualPublished], 
                        backgroundColor: ['#27ae60', '#f1c40f'], 
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const val = ctx.raw;
                                    const perc = validTotal > 0 ? ((val / validTotal) * 100).toFixed(1) : 0;
                                    return `${ctx.label}: ${val}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // --- 4. BAR CHART (TOP LOCATIONS) ---
        const locCtx = document.getElementById('locationChart');
        if (locCtx && locations.length > 0) {
            new Chart(locCtx, {
                type: 'bar',
                data: {
                    labels: locations.map(row => row.location),
                    datasets: [{
                        label: 'Items Lost per Location',
                        data: locations.map(row => Number(row.count)),
                        backgroundColor: '#3498db'
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

    } catch (err) {
        console.error("Critical Chart Error:", err);
    }
}
/**
 * NEW: The trigger function for your HTML dropdowns
 */
function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const timeRange = document.getElementById('timeFilter').value;
    loadCharts(category, timeRange);
}

// --- Notification Logic (Unchanged) ---
async function checkNotifications() {
    try {
        const response = await fetch('/api/admin/items');
        if (response.status === 401) return; 
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
    } catch (error) { console.error("Notification Fetch Error:", error); }
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
                const itemDiv = document.createElement('div');
                itemDiv.style.cssText = `padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 0.85rem; color: #444; cursor: pointer; background: ${n.read ? 'white' : '#f0f7ef'}`;
                itemDiv.innerHTML = `<strong>${n.time}</strong>: ${n.text}`;
                itemDiv.addEventListener('click', () => {
                    notifications[index].read = true;
                    localStorage.setItem('refoundly_notifications', JSON.stringify(notifications));
                    updateNotifBadge();
                    window.location.href = 'AdReport.html';
                });
                list.appendChild(itemDiv);
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
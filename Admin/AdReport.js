// --- GLOBAL STATE ---
let itemsData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 6;

const contractAddress = "0xd920b4Ad789Dc5ceAbd59DfF1427912153deaD73"; 
const contractABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
            { "indexed": false, "internalType": "address", "name": "reporter", "type": "address" }
        ],
        "name": "ReportLogged",
        "type": "event"
    },
    // Replace the createReport part in your contractABI array with this:
{
    "inputs": [
        { "internalType": "uint256", "name": "_id", "type": "uint256" }, 
        { "internalType": "string", "name": "_title", "type": "string" },
        { "internalType": "string", "name": "_category", "type": "string" },
        { "internalType": "string", "name": "_location", "type": "string" }
    ],
    "name": "createReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
},
    {
        "inputs": [
            { "internalType": "uint256", "name": "_id", "type": "uint256" }
        ],
        "name": "markAsResolved",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "reports",
        "outputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "string", "name": "itemTitle", "type": "string" },
            { "internalType": "string", "name": "category", "type": "string" },
            { "internalType": "string", "name": "location", "type": "string" },
            { "internalType": "address", "name": "reporter", "type": "address" },
            { "internalType": "bool", "name": "isResolved", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalReports",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]; // Ensur

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

    // Modal backdrop click
    window.addEventListener("click", (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal();
            closeConfirmModal();
        }
    });

    fetchItems();
    updateNotifBadge();
});

// API FUNCTIONS

async function fetchItems() {
    try {
        // NOTE: Ensure your server is running on the same port!
        const response = await fetch('/api/admin/items');
        
        if (response.status === 401 || response.redirected) {
            window.location.href = "AdLogin.html";
            return;
        }

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

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
        itemsData = freshData;
        filteredData = [...itemsData];
        
        renderTable();
        updateCounts();
    } catch (error) {
        console.error("Error loading items:", error);
        const tbody = document.getElementById("reportsTableBody");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan='6' style='text-align:center; color:red;'>
                Failed to connect to server. Ensure your backend is running.
            </td></tr>`;
        }
    }
}

setInterval(fetchItems, 20000);

async function changeStatus(id, newStatus) {
    let txHash = null;
    let gasUsed = null;
    const web3 = new Web3("http://127.0.0.1:7545");
    const accounts = await web3.eth.getAccounts();
    const adminWallet = accounts[0];

    /* LOCATE THIS IN YOUR AdReport.js */
if (newStatus === 'Resolved') {
    try {
        const myContract = new web3.eth.Contract(contractABI, contractAddress);
        
        // Use Number() to ensure the ID is a valid uint256 for the Solidity require check
        const receipt = await myContract.methods.markAsResolved(Number(id)).send({
            from: adminWallet,
            gas: 200000 
        });

        txHash = receipt.transactionHash;
        gasUsed = receipt.gasUsed;
    } catch (blockchainError) {
        console.error("Blockchain error:", blockchainError);
        // This is where your 'Report does not exist' revert is caught
    }
}

    // 2. DATABASE LOGIC (Always runs for Approve, Deny, AND successfully resolved items)
    try {
        const response = await fetch('/api/admin/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                itemId: id, 
                newStatus: newStatus, 
                txHash: txHash,
                gasUsed: gasUsed, 
                walletAddress: adminWallet 
            })
        });

        const result = await response.json();
        if (result.success) {
            fetchItems(); // UI Refreshes here
        } else {
            alert("Database update failed: " + result.message);
        }
    } catch (dbError) {
        console.error("Database error:", dbError);
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
            tr.innerHTML = `
                <td>${item.item_name || "Unknown"}</td>
                <td><strong>${reporterName}</strong></td>
                <td>${item.category || "General"}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${displayDate}</td>
                <td class="action-cell"></td>`;

            const actionCell = tr.querySelector('.action-cell');

            // CSP-Safe Button Creation
            actionCell.appendChild(createButton("Details", "btn-view", () => showDetails(item.id)));

            if (statusText === "Pending Approval") {
                actionCell.appendChild(createButton("Approve", "btn-approve", () => confirmStatusChange(item.id, 'Published')));
                actionCell.appendChild(createButton("Deny", "btn-deny", () => confirmStatusChange(item.id, 'Denied')));
            } else if (statusText === "Published") {
                actionCell.appendChild(createButton("Mark Resolved", "btn-resolve", () => confirmStatusChange(item.id, 'Resolved')));
            }

            tbody.appendChild(tr);
        });
    }
    updatePaginationUI();
}

// Utility to create buttons without inline 'onclick'
function createButton(text, className, callback) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = text;
    btn.addEventListener('click', callback);
    return btn;
}

// --- MODAL LOGIC ---

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
        <div style="margin-top: 15px; padding: 10px; background: #f9f9f9; border-left: 4px solid #5d9e52;">
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

    // Robust ID matching to handle number vs string
    const item = itemsData.find(i => String(i.id) === String(id));

    // 1. SAFETY CHECK: Prevents the "Uncaught TypeError" if item is missing
    if (!item) {
        console.error(`Item ID ${id} not found. Try refreshing the page.`);
        return;
    }

    // 2. UI CONFIGURATION based on status
    const config = {
        'Published': { color: "#28a745", title: "Approve Item", verb: "Approve" },
        'Denied':    { color: "#dc3545", title: "Deny Item",    verb: "Deny" },
        'Resolved':  { color: "#17a2b8", title: "Mark Resolved", verb: "Resolve" }
    };

    const settings = config[newStatus] || config['Resolved'];

    header.style.backgroundColor = settings.color;
    title.innerText = settings.title;
    msg.innerText = `${settings.verb} "${item.item_name}"?`;
    yesBtn.style.backgroundColor = settings.color;

    modal.style.display = "block";

    // 3. SECURE LISTENER REBINDING
    // Clones the button to remove old event listeners from previous clicks
    const newYesBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    
    newYesBtn.addEventListener('click', () => {
        console.log(`Executing ${newStatus} for Item ID: ${id}`);
        changeStatus(id, newStatus);
        closeConfirmModal();
    });
}

function closeModal() { document.getElementById("itemModal").style.display = "none"; }
function closeConfirmModal() { document.getElementById("confirmModal").style.display = "none"; }

// --- FILTER & NOTIFICATION LOGIC ---

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
    const list = document.getElementById("notifList");
    const isOpening = drop.style.display === "none" || drop.style.display === "";
    
    drop.style.display = isOpening ? "block" : "none";
    
    if (isOpening) {
        if (notifications.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: #999;">No notifications</div>`;
        } else {
            list.innerHTML = "";
            notifications.forEach((n, index) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = `notif-item ${n.read ? '' : 'unread'}`;
                itemDiv.innerHTML = `<strong>${n.time}</strong>: ${n.text}`;
                itemDiv.addEventListener('click', () => handleNotifClick(index, n.itemId));
                list.appendChild(itemDiv);
            });
        }
    }
}

function handleNotifClick(index, itemId) {
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
    
    const cards = document.querySelectorAll(".summary-cards h3");
    if (cards.length >= 3) {
        cards[0].innerText = active;
        cards[2].innerText = resolved;
    }
}


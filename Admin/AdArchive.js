// --- GLOBAL STATE ---
let archivedData = [];
let filteredArchivedData = [];
let currentPage = 1;
const itemsPerPage = 6;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    loadArchivedData();

    // Attach Event Listeners
    document.getElementById("searchInput")?.addEventListener("input", filterArchiveTable);
    document.getElementById("prevBtn")?.addEventListener("click", () => changeArchivePage(-1));
    document.getElementById("nextBtn")?.addEventListener("click", () => changeArchivePage(1));
});

// --- DATA LOADING ---
async function loadArchivedData() {
    try {
        const response = await fetch('/api/items/archived');
        const data = await response.json(); // Isang beses lang basahin ang stream

        if (!response.ok) {
            throw new Error(data.error || `HTTP Status ${response.status}`);
        }
        
        archivedData = data;
        filteredArchivedData = [...archivedData];
        renderArchiveTable();
    } catch (error) {
        console.error("Error fetching archived items:", error);
        archivedData = [];
        filteredArchivedData = [];
        renderArchiveTable();
    }
}

// --- RENDER TABLE ---
function renderArchiveTable() {
    const tbody = document.getElementById("reportsTableBody"); 
    if (!tbody) return;
    
    tbody.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredArchivedData.slice(start, end);

    if (pageItems.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No archived reports found.</td></tr>";
        updateArchivePagination();
        return;
    }

    pageItems.forEach(item => {
        const statusText = item.status || "Archived";
        const statusClass = statusText.toLowerCase().replace(/\s+/g, '-');
        const reporterName = `${item.contact_firstname || ''} ${item.contact_lastname || ''}`.trim() || "N/A";
        const dateArchived = item.archivedDate || (item.archived_at ? new Date(item.archived_at).toLocaleDateString() : "N/A");

        const tr = document.createElement("tr");
        tr.setAttribute("data-id", item.id);
        tr.innerHTML = `
            <td>${item.item_name || "Unknown"}</td>
            <td><strong>${reporterName}</strong></td>
            <td>${item.category || "General"}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
            <td>${dateArchived}</td>
            <td class="action-cell"></td>
        `;

        const actionCell = tr.querySelector('.action-cell');
        
        // Restore Button
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'btn-approve';
        restoreBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restore';
        restoreBtn.addEventListener('click', () => openRestoreModal(item));
        actionCell.appendChild(restoreBtn);

        tbody.appendChild(tr);
    });

    updateArchivePagination();
}

// --- MODAL & RESTORE LOGIC ---
function openRestoreModal(item) {
    const modal = document.getElementById("itemModal");
    const modalBody = document.getElementById("modalBody");
    const reporterName = `${item.contact_firstname || ''} ${item.contact_lastname || ''}`.trim() || "N/A";
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; font-size: 15px; color: #444;">
            <p style="margin: 8px 0;"><strong>Item Name:</strong> ${item.item_name || "Unknown"}</p>
            <p style="margin: 8px 0;"><strong>Category:</strong> ${item.category || "General"}</p>
            <p style="margin: 8px 0;"><strong>Reporter:</strong> ${reporterName}</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> <span class="badge ${(item.status || 'archived').toLowerCase().replace(/\s+/g, '-')}">${item.status || 'Archived'}</span></p>
            <p style="margin: 8px 0;"><strong>Description:</strong> ${item.description || "No description provided."}</p>
        </div>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 15px;">
            <p style="margin: 0; font-size: 0.9rem; color: #666;">Restore this item back to main reports?</p>
            <button id="confirmRestoreBtn" class="btn-archive" style="background-color: #5D8252;">Yes, Restore</button>
        </div>
    `;
    
    modal.style.display = "block";

    const confirmBtn = document.getElementById("confirmRestoreBtn");
    if (confirmBtn) {
        confirmBtn.onclick = () => executeRestoreAndRedirect(item.id);
    }

    const closeBtn = document.getElementById("closeItemModal");
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = "none";
        };
    }
}

async function executeRestoreAndRedirect(id) {
    try {
        const response = await fetch(`/api/items/${id}/unarchive`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            console.warn("API request failed or route missing.");
        }
    } catch (error) {
        console.error("Error connecting to server:", error);
    }

    // Update state locally & UI cleanup
    archivedData = archivedData.filter(item => item.id !== id);
    filteredArchivedData = filteredArchivedData.filter(item => item.id !== id);
    localStorage.setItem('refoundly_archived_items', JSON.stringify(archivedData));

    let knownIds = new Set(JSON.parse(localStorage.getItem('refoundly_known_ids')) || []);
    knownIds.delete(id);
    localStorage.setItem('refoundly_known_ids', JSON.stringify([...knownIds]));

    document.getElementById("itemModal").style.display = "none";
    window.location.href = 'AdReport.html';
}

// --- FILTER & PAGINATION ---
function filterArchiveTable() {
    const searchInput = (document.getElementById("searchInput")?.value || "").toLowerCase();

    filteredArchivedData = archivedData.filter(item => {
        const reporterName = `${item.contact_firstname || ''} ${item.contact_lastname || ''}`.toLowerCase();
        const searchPool = [item.item_name, item.category, item.status, reporterName].join(' ').toLowerCase();
        return searchPool.includes(searchInput);
    });

    currentPage = 1;
    renderArchiveTable();
}

function updateArchivePagination() {
    const totalPages = Math.ceil(filteredArchivedData.length / itemsPerPage) || 1;
    const pageDisplay = document.getElementById("pageDisplay");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (pageDisplay) pageDisplay.innerText = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

function changeArchivePage(step) {
    currentPage += step;
    renderArchiveTable();
}
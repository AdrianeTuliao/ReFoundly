let allItems = []; 
let filteredItems = []; 
let currentPage = 1;
const itemsPerPage = 3; 

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
        if (response.status === 401) return; // Let checkSession handle this
        
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
        const matchCategory = !category || item.category.toLowerCase().includes(category);
        const matchLocation = !location || item.location.toLowerCase().includes(location);
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

        // XSS Protection via textContent
        const tempDiv = document.createElement('div');
        tempDiv.textContent = item.item_name; 
        const safeItemName = tempDiv.innerHTML; 

        const imageHtml = item.image_path 
            ? `<img src="${item.image_path}" alt="Item" style="width:100%; height:200px; object-fit:cover;">`
            : `<div class="card-img" style="height:200px; display:flex; align-items:center; justify-content:center; background:#eee;">No Image</div>`;

        const dbType = (item.report_type || item.type || "").toLowerCase().trim();

        // NOTE: We removed the 'onclick' attribute here to satisfy CSP
        card.innerHTML = `
            ${imageHtml}
            <div class="card-body">
                <h4>${safeItemName}</h4> 
                <span class="badge" style="background:#78A454; color:white; padding:2px 8px; border-radius:4px;">${item.category}</span>
                <p style="font-size: 12px; color: #999; margin-top:10px;">Posted: ${item.formattedDate || 'Recent'}</p>
                <button class="btn-main view-details-btn" style="width:100%; margin-top:15px; cursor: pointer;">View Details</button>
            </div>
        `;

        // Attach event listener properly
        card.querySelector('.view-details-btn').addEventListener('click', () => {
            finalRedirect(item.id, dbType);
        });

        grid.appendChild(card);
    });

    updatePaginationUI();
}

// 5. Navigation & UI Helpers
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

// 6. Initialize
document.addEventListener("DOMContentLoaded", () => {
    setupSearch('categoryInput', 'categoryList');
    setupSearch('locationInput', 'locationList');
    loadPublishedItems();

    const searchBtn = document.querySelector('.search-container .btn-main');
    if(searchBtn) searchBtn.addEventListener('click', applyFilters);

    document.getElementById("prevBtn")?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    document.getElementById("nextBtn")?.addEventListener("click", () => {
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    // Session Modal Button Listener
    document.getElementById('retry-login-btn')?.addEventListener('click', () => {
        window.location.href = '/index.html';
    });
});

function checkSession() {
    fetch('/user/me')
        .then(response => {
            if (response.status === 401) {
                const modal = document.getElementById('session-alert');
                if (modal) {
                    modal.style.setProperty('display', 'flex', 'important');
                }
            }
        })
        .catch(() => {
            console.log("Connection lost or session check failed.");
        });
}
setInterval(checkSession, 5000);
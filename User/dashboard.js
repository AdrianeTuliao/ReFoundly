(() => {
    let allItems = []; 
    let filteredItems = []; 
    let currentPage = 1;
    // Items per page depends on screen size: phone 2 (portrait or landscape), tablet 2, laptop/desktop 3
    function getItemsPerPage() {
        const w = window.innerWidth;
        if (window.matchMedia("(max-height: 500px) and (orientation: landscape)").matches) return 2;
        if (w <= 1024) return 2;
        return 3;
    }
    let itemsPerPage = getItemsPerPage();

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

function applyFilters() {
    const category = document.getElementById('categoryInput').value.toLowerCase().trim();
    const location = document.getElementById('locationInput').value.toLowerCase().trim();
    const nameSearch = document.querySelector('.search-group input[placeholder="Search item name..."]')?.value.toLowerCase().trim() || "";

    filteredItems = allItems.filter(item => {
        const matchCategory = !category || category === 'all' || category === 'all categories' || item.category.toLowerCase().includes(category);
        const matchLocation = !location || location === 'all' || location === 'all barangays' || item.location.toLowerCase().includes(location);
        const itemName = (item.item_name || "").toLowerCase();
        const itemBrand = (item.brand || "").toLowerCase();
        const matchNameOrBrand = !nameSearch || itemName.includes(nameSearch) || itemBrand.includes(nameSearch);
        
        return matchCategory && matchLocation && matchNameOrBrand;
    });

    currentPage = 1; 
    renderPage(1);
    scrollToResults();
}

// After pressing Search, bring the matching items into view
// (they sit below the hero and the "How It Works" section).
function scrollToResults() {
    const target = document.querySelector('.content-wrapper > h4');
    if (!target) return;

    // close the phone keyboard / dropdown focus first so the layout settles before we scroll
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    const nav = document.querySelector('.navbar');            // sticky header covers the top of the screen
    const offset = (nav ? nav.offsetHeight : 0) + 12;
    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    requestAnimationFrame(() => {
        window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? 'auto' : 'smooth' });
    });
}

// 4. Render Grid (CSP SECURE VERSION)
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

        const isSensitive = Boolean(item.is_sensitive_image);

        const imageHtml = item.image_path 
            ? (isSensitive
                ? `<div class="card-img-wrapper sensitive-img-wrapper" data-item-id="${item.id}">
                       <img src="${item.image_path}" class="sensitive-img" draggable="false" oncontextmenu="return false;">
                       <div class="sensitive-img-overlay"><i class="fas fa-eye-slash"></i><span>Blurred for privacy — verify in direct message</span></div>
                   </div>`
                : `<img src="${item.image_path}" alt="Item" style="width:100%; height:200px; object-fit:cover;">`
              )
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

    // NOTE: notification bell/dropdown/tabs are handled globally by
    // notifications.js (loaded after this file). Dashboard used to have
    // its own duplicate copy of that logic here, which fought with
    // notifications.js over the same #notifBell/#notifDropdown elements —
    // both would toggle the dropdown open/closed on the same click,
    // closing it again immediately. Removed to avoid that conflict.

    // --- OTHER LISTENERS ---
    // Pagination, Search, and Session checks...
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    prevBtn?.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage ? renderPage(currentPage) : updateView();
        }
    });

    nextBtn?.addEventListener("click", () => {
        const totalItems = filteredItems ? filteredItems.length : allItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage ? renderPage(currentPage) : updateView();
        }
    });

    const searchBtn = document.querySelector('.search-container .btn-main1');
    if (searchBtn) searchBtn.addEventListener('click', applyFilters);

    document.getElementById('retry-login-btn')?.addEventListener('click', () => {
        window.location.href = '/index.html';
    });

    setInterval(checkSession, 60000);

    // Re-paginate when the screen size changes (rotate phone, resize window),
    // keeping the first visible item on screen.
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const newCount = getItemsPerPage();
            if (newCount === itemsPerPage) return;
            const firstIndex = (currentPage - 1) * itemsPerPage;
            itemsPerPage = newCount;
            currentPage = Math.floor(firstIndex / itemsPerPage) + 1;
            renderPage(currentPage);
        }, 150);
    });
});

})();
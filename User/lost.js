let allItems = [];
let filteredItems = [];
let currentPage = 1;
const itemsPerPage = 4; // Number of items per page

document.addEventListener("DOMContentLoaded", () => {
    // Move the popup out of <body> so no transformed/animated page wrapper can trap its
    // "position: fixed" (that is what made it open at the top of the page instead of on screen).
    const itemModalEl = document.getElementById("itemModal");
    if (itemModalEl && itemModalEl.parentElement !== document.documentElement) {
        document.documentElement.appendChild(itemModalEl);
    }
    loadLostItems();
    
    // --- SEARCH LOGIC ---
    const searchInput = document.querySelector('.search-bar-pill input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            
            // Filter by Name, Category, or Location
            filteredItems = allItems.filter(item => 
                (item.item_name && item.item_name.toLowerCase().includes(searchTerm)) ||
                (item.category && item.category.toLowerCase().includes(searchTerm)) ||
                (item.location && item.location.toLowerCase().includes(searchTerm))
            );

            currentPage = 1; // Reset to page 1 on new search
            renderItems();
            renderPagination();
        });
    }

    window.onclick = (event) => {
        const modal = document.getElementById("itemModal");
        if (event.target == modal) closeModal();
    };
});

async function loadLostItems() {
    try {
        const response = await fetch('/api/items/lost');
        allItems = await response.json();
        filteredItems = [...allItems]; // Initialize filteredItems with all data
        
        // Initial render
        renderItems();
        renderPagination();

        // Check URL for item to highlight (Green Light effect)
        const urlParams = new URLSearchParams(window.location.search);
        const itemIdToOpen = urlParams.get('open');
        if (itemIdToOpen) {
            const itemIndex = allItems.findIndex(i => i.id == itemIdToOpen);
            if (itemIndex !== -1) {
                currentPage = Math.ceil((itemIndex + 1) / itemsPerPage);
                updateView();
                
                setTimeout(() => {
                    const targetCard = document.querySelector(`[data-id="${itemIdToOpen}"]`);
                    if (targetCard) {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetCard.classList.add('highlight-card');
                    }
                }, 500);
            }
        }

    } catch (error) {
        console.error("Fetch error:", error);
    }
}

function renderItems() {
    const grid = document.querySelector(".items-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (filteredItems.length === 0) {
        grid.innerHTML = "<h3 style='grid-column: 1/-1; text-align:center;'>No items match your search.</h3>";
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredItems.slice(start, end);

    paginatedItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.setAttribute('data-id', item.id);
        card.onclick = () => openModal(item.id);

        const isSensitive = Boolean(item.is_sensitive_image);

        const imgHtml = item.image_path
            ? (isSensitive
                ? `<div class="card-img-wrapper sensitive-img-wrapper" data-item-id="${item.id}">
                       <img src="${item.image_path}" class="sensitive-img" draggable="false" oncontextmenu="return false;">
                       <div class="sensitive-img-overlay"><i class="fas fa-eye-slash"></i><span>Blurred for privacy — verify in direct message</span></div>
                   </div>`
                : `<img src="${item.image_path}" style="width:100%; height:50px; object-fit:cover; border-radius: 8px 8px 0 0;">`
              )
            : `<div class="card-img-placeholder">No Image Provided</div>`;

        card.innerHTML = `
            ${imgHtml}
            <div class="card-content">
                <h3>${item.item_name}</h3>
                <hr class="title-line">
                <span class="badge" style="background:#D97706; color:white; padding:2px 8px; border-radius:4px;">${item.category}</span>
                <div class="item-details">
                    <p><strong>Description:</strong> ${item.description || 'No description'}</p>
                    <p><strong>Where Lost:</strong> ${item.location}</p>
                    <p><strong>Status:</strong> <span class="status-lost">Lost</span></p>
                    <p><strong>Owner:</strong> ${item.contact_firstname} ${item.contact_lastname}</p>
            
                    <div class="post-time">
                        <small>Date Lost: ${item.formattedDate}</small><br>
                        <small>Time Lost: ${item.formattedTime || ''}</small>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderPagination() {
    const paginationContainer = document.querySelector(".pagination");
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

    const prevBtn = document.createElement("button");
    prevBtn.className = "pag-btn-large";
    prevBtn.textContent = "Previous";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = (e) => { 
        e.stopPropagation(); 
        if(currentPage > 1) { currentPage--; updateView(); } 
    };
    paginationContainer.appendChild(prevBtn);

    const pageIndicator = document.createElement("span");
    pageIndicator.className = "page-indicator";
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageIndicator);

    const nextBtn = document.createElement("button");
    nextBtn.className = "pag-btn-large";
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = (e) => { 
        e.stopPropagation(); 
        if(currentPage < totalPages) { currentPage++; updateView(); } 
    };
    paginationContainer.appendChild(nextBtn);
}

function updateView() {
    renderItems();
    renderPagination();
}

function openModal(id) {
    const highlighted = document.querySelector('.highlight-card');
    if (highlighted) highlighted.classList.remove('highlight-card');

    const item = allItems.find(i => i.id === id);
    if (!item) return;

    const isSensitive = Boolean(item.is_sensitive_image);
    const modalImgHtml = isSensitive
        ? `<div class="card-img-wrapper sensitive-img-wrapper modal-sensitive-img" id="modalSensitiveImg">
               <img src="${item.image_path || 'placeholder.png'}" class="sensitive-img" draggable="false" oncontextmenu="return false;" style="width:100%; border-radius:15px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
               <div class="sensitive-img-overlay"><i class="fas fa-eye-slash"></i><span>Blurred for privacy — verify in direct message</span></div>
           </div>`
        : `<img src="${item.image_path || 'placeholder.png'}" style="width:100%; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;

    const body = document.getElementById("modalBody");
    if (body) {
        body.innerHTML = `
            <div class="modal-body-grid">
                <div class="modal-col-left">
                    <div class="modal-title-header">
                        <h1 class="modal-item-title">${item.item_name}</h1>
                        <span class="status-badge-published">Published</span>
                    </div>
                    ${modalImgHtml}
                    <p style="margin-top:12px; color:#666;">Report Type: <strong>${item.status || 'Lost'}</strong></p>
                </div>
                <div style="flex: 1 1 260px; min-width: 0;">
                    <h3 class="info-header">Item Information</h3>
                    <p><strong>Category:</strong> ${item.category}</p>
                    <p><strong>Brand:</strong> ${item.brand || 'N/A'}</p>
                    <p><strong>Location:</strong> ${item.location}</p>
                    <p><strong>Date:</strong> ${item.formattedDate}</p>
                    <p><strong>Time:</strong> ${item.formattedTime || 'N/A'}</p>
                    <h3 class="info-header" style="margin-top:30px;">Description</h3>
                    <p style="line-height:1.6;">${item.description || 'No description provided.'}</p>
                    <div class="contact-box">
                        <h4 style="margin-top:0;">Contact Owner</h4>
                        <p><strong>Name:</strong> ${item.contact_firstname} ${item.contact_lastname}</p>

                        <button 
                            class="chat-user-btn"
                            onclick="event.stopPropagation(); chatWithUser(${item.user_id}, ${item.id})">
                            <i class="fas fa-comment-dots"></i>
                            Chat with User
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    const modal = document.getElementById("itemModal");
    if (modal) {
        modal.classList.add("show");
        document.body.classList.add("item-details-modal-open");
        document.documentElement.classList.add("item-details-modal-open");
    }
}

function closeModal() {
    const modal = document.getElementById("itemModal");
    if (modal) {
        modal.classList.remove("show");
        modal.style.display = "";
    }
    document.body.classList.remove("item-details-modal-open");
    document.documentElement.classList.remove("item-details-modal-open");
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
setInterval(checkSession, 60000);

document.addEventListener("DOMContentLoaded", () => {
    const closeBtn = document.getElementById("closeModalBtn");
    const modal = document.getElementById("itemModal");

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", closeModal);

        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
});

function chatWithUser(userId, itemId) {
    if (!userId) {
        alert("Unable to identify this user.");
        return;
    }

    window.location.href = `message.html?user=${encodeURIComponent(userId)}&item=${encodeURIComponent(itemId)}`;
}
    let allItems = [];
    let filteredItems = [];
    let currentPage = 1;
    const itemsPerPage = 4; // Number of items per page

    document.addEventListener("DOMContentLoaded", () => {
        loadLostItems();
        
        // --- SEARCH LOGIC ---
        const searchInput = document.querySelector('.search-bar-pill input');
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

        window.onclick = (event) => {
            const modal = document.getElementById("itemModal");
            if (event.target == modal) closeModal();
        }
    });

    async function loadLostItems() {
        try {
            const response = await fetch('/api/items/lost');
            allItems = await response.json();
            filteredItems = [...allItems]; // Initialize filteredItems with all data
            
            // Initial render
            renderItems();
            renderPagination();

            // RESTORED: Check URL for item to highlight (Green Light effect)
            const urlParams = new URLSearchParams(window.location.search);
            const itemIdToOpen = urlParams.get('open');
            if (itemIdToOpen) {
                // Find which page the item belongs to
                const itemIndex = allItems.findIndex(i => i.id == itemIdToOpen);
                if (itemIndex !== -1) {
                    currentPage = Math.ceil((itemIndex + 1) / itemsPerPage);
                    updateView(); // Refresh to correct page
                    
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
        grid.innerHTML = "";

        // Change: Check filteredItems instead of allItems
        if (filteredItems.length === 0) {
            grid.innerHTML = "<h3 style='grid-column: 1/-1; text-align:center;'>No items match your search.</h3>";
            return;
        }

        // Pagination Logic: Slice the filtered array based on current page
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = filteredItems.slice(start, end);

        paginatedItems.forEach(item => {
            const card = document.createElement("div");
            card.className = "item-card";
            card.setAttribute('data-id', item.id);
            card.onclick = () => openModal(item.id);

            const imgHtml = item.image_path     
                ? `<img src="${item.image_path}" style="width:100%; height:200px; object-fit:cover; border-radius: 8px 8px 0 0;">`
                : `<div class="card-img-placeholder">No Image Provided</div>`;

            card.innerHTML = `
                ${imgHtml}
                <div class="card-content">
                    <h3>${item.item_name}</h3>
                    <hr class="title-line">
                    <span class="badge">${item.category}</span>
                    <div class="item-details">
                        <p><strong>Description:</strong> ${item.description || 'No description'}</p>
                        <p><strong>Where Lost:</strong> ${item.location}</p>
                        <p><strong>Status:</strong> <span class="status-lost">Lost</span></p>
                        <p><strong>Owner:</strong> ${item.contact_firstname} ${item.contact_lastname}</p>
                        <p><strong>Phone Number:</strong> ${item.contact_phone}</p>
                        <p><strong>Email:</strong> ${item.contact_email}</p>
                        <div class="post-time">
                            <small>Date Lost: ${item.formattedDate}</small><br>
                            <small>Time Lost: ${item.formattedTime || ''}</small>
                        </div>
                    </div>
                    <input type="text" class="comment-input" placeholder="Leave a comment..." onclick="event.stopPropagation()">
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function renderPagination() {
        const paginationContainer = document.querySelector(".pagination");
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = "";
        // Change: Calculate totalPages based on filteredItems
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

        // Hide pagination if only one page
        if (totalPages <= 1 && filteredItems.length > 0) return;

        // Previous Button (<)
        const prevBtn = document.createElement("button");
        prevBtn.className = "pag-btn";
        prevBtn.innerHTML = "&lt;";
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = (e) => { 
            e.stopPropagation();
            if(currentPage > 1) { currentPage--; updateView(); } 
        };
        paginationContainer.appendChild(prevBtn);

        // Page Numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const pageBtn = document.createElement("button");
                pageBtn.className = `pag-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.onclick = (e) => { 
                    e.stopPropagation();
                    currentPage = i; 
                    updateView(); 
                };
                paginationContainer.appendChild(pageBtn);
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                const dots = document.createElement("span");
                dots.textContent = "..";
                paginationContainer.appendChild(dots);
            }
        }

        // Next Button (>)
        const nextBtn = document.createElement("button");
        nextBtn.className = "pag-btn";
        nextBtn.innerHTML = "&gt;";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = (e) => { 
            e.stopPropagation();
            if(currentPage < totalPages) { currentPage++; updateView(); } 
        };
        paginationContainer.appendChild(nextBtn);
    }

    // Refresh view helper
    function updateView() {
        renderItems();
        renderPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openModal(id) {
        const highlighted = document.querySelector('.highlight-card');
        if (highlighted) highlighted.classList.remove('highlight-card');

        const item = allItems.find(i => i.id === id);
        if (!item) return;

        const body = document.getElementById("modalBody");
        body.innerHTML = `
            <div style="display: flex; gap: 40px; align-items: flex-start;">
                <div style="flex: 1;">
                    <span class="status-badge-published">Published</span>
                    <h1 style="margin-top: 0;">${item.item_name}</h1>
                    <img src="${item.image_path || 'placeholder.png'}" style="width:100%; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <p style="margin-top:15px; color:#666;">Report Type: <strong>${item.status || 'Lost'}</strong></p>
                </div>
                <div style="flex: 1;">
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
                        <p><strong>Phone:</strong> ${item.contact_phone}</p>
                        <p><strong>Email:</strong> ${item.contact_email}</p>
                    </div>
                   
                </div>
            </div>
        `;
        document.getElementById("itemModal").style.display = "block";
    }

    function closeModal() {
        document.getElementById("itemModal").style.display = "none";
    }

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
        .catch(err => {
            console.log("Connection lost or session check failed.");
        });
}
setInterval(checkSession, 5000);

document.addEventListener("DOMContentLoaded", () => {
    // 1. Logic to close the modal
    const closeBtn = document.getElementById("closeModalBtn");
    const modal = document.getElementById("itemModal");

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });

        // Also close if the user clicks outside the modal box
        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    }
});
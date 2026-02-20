let allItems = [];
    let filteredItems = []; // Added to hold search results
    let currentPage = 1;
    const itemsPerPage = 4;

    document.addEventListener("DOMContentLoaded", () => {
        loadFoundItems();

        // --- SEARCH LOGIC ---
        const searchInput = document.querySelector('.search-bar-pill input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                
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
        }
    });

    async function loadFoundItems() {
        try {
            const response = await fetch('/api/items/found');
            allItems = await response.json();
            filteredItems = [...allItems]; // Initialize filteredItems with fetched data
            
            renderItems();
            renderPagination();

            // Highlight & Auto-open Logic
            const urlParams = new URLSearchParams(window.location.search);
            const itemIdToOpen = urlParams.get('open');
            if (itemIdToOpen) {
                const itemIndex = allItems.findIndex(i => i.id == itemIdToOpen);
                if (itemIndex !== -1) {
                    currentPage = Math.ceil((itemIndex + 1) / itemsPerPage);
                    updateView(); // Refreshes grid to the right page
                    
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
            console.error("Error fetching found items:", error);
        }
    }

    function renderItems() {
        const grid = document.querySelector(".items-grid");
        grid.innerHTML = "";

        // Check filteredItems instead of allItems
        if (filteredItems.length === 0) {
            grid.innerHTML = "<h3 style='grid-column: 1/-1; text-align:center;'>No items match your search.</h3>";
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = filteredItems.slice(start, end); // Use filteredItems

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
                        <p><strong>Where Found:</strong> ${item.location}</p>
                        <p><strong>Status:</strong> <span class="status-found">Found</span></p>
                        <p><strong>Founder:</strong> ${item.contact_firstname} ${item.contact_lastname}</p>
                        <p><strong>Contact:</strong> ${item.contact_phone}</p>
                        <p><strong>Email:</strong> ${item.contact_email}</p>
                        <div class="post-time">
                            <small>Date Found: ${item.formattedDate}</small><br>
                            <small>Time Found: ${item.formattedTime || ''}</small>
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
        // Calculate totalPages based on filteredItems
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;

        // Previous Button
        const prevBtn = document.createElement("button");
        prevBtn.className = "pag-btn";
        prevBtn.innerHTML = "&lt;";
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = (e) => { e.stopPropagation(); if(currentPage > 1) { currentPage--; updateView(); } };
        paginationContainer.appendChild(prevBtn);

        // Numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const pageBtn = document.createElement("button");
                pageBtn.className = `pag-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.onclick = (e) => { e.stopPropagation(); currentPage = i; updateView(); };
                paginationContainer.appendChild(pageBtn);
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                const dots = document.createElement("span");
                dots.textContent = "..";
                paginationContainer.appendChild(dots);
            }
        }

        // Next Button
        const nextBtn = document.createElement("button");
        nextBtn.className = "pag-btn";
        nextBtn.innerHTML = "&gt;";
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = (e) => { e.stopPropagation(); if(currentPage < totalPages) { currentPage++; updateView(); } };
        paginationContainer.appendChild(nextBtn);
    }

    function updateView() {
        renderItems();
        renderPagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openModal(id) {
        const item = allItems.find(i => i.id == id);
        if (!item) return;

        const body = document.getElementById("modalBody");
        body.innerHTML = `
            <div style="display: flex; gap: 40px; align-items: flex-start;">
                <div style="flex: 1;">
                    <span class="status-badge-published">Published</span>
                    <h1 style="margin-top: 0;">${item.item_name}</h1>
                    <img src="${item.image_path || 'placeholder.png'}" style="width:100%; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    <p style="margin-top:15px; color:#666;">Report Type: <strong>Found</strong></p>
                </div>
                <div style="flex: 1;">
                    <h3 class="info-header">Item Information</h3>
                    <p><strong>Category:</strong> ${item.category}</p>
                    <p><strong>Location:</strong> ${item.location}</p>
                    <p><strong>Date:</strong> ${item.formattedDate}</p>
                    <h3 class="info-header" style="margin-top:30px;">Description</h3>
                    <p>${item.description || 'No description provided.'}</p>
                    <div class="contact-box">
                        <h4 style="margin-top:0;">Contact Founder</h4>
                        <p><strong>Name:</strong> ${item.contact_firstname} ${item.contact_lastname}</p>
                        <p><strong>Phone:</strong> ${item.contact_phone}</p>
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
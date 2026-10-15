document.addEventListener("DOMContentLoaded", () => {
    // 1. DOM Element References
    const itemModalEl = document.getElementById("itemModal");
    const grid = document.getElementById("history-grid");
    const paginationContainer = document.getElementById("pagination-container");
    const searchInput = document.getElementById("history-search");
    const wrapper = document.querySelector(".main-wrapper");

    // Move modal out of body to avoid CSS transform positioning bugs
    if (itemModalEl && itemModalEl.parentElement !== document.documentElement) {
        document.documentElement.appendChild(itemModalEl);
    }

    let allData = [];
    let filteredData = [];
    let currentPage = 1;

    // Status color code (used by the card and the popup badge):
    //   Published        -> green  (live, visible to everyone)
    //   Pending Approval -> yellow (waiting for admin review)
    //   Resolved         -> blue   (item has been returned / case closed)
    //   anything else    -> gray   (so an unexpected value is never shown in a wrong color)
    function getStatusClass(status) {
        const s = String(status || "").toLowerCase().trim();
        if (s === "published") return "status-published";
        if (s === "pending approval" || s === "pending") return "status-pending";
        if (s === "resolved") return "status-resolved";
        return "status-other";
    }

    // 2. Responsive Items Calculation
    function getItemsPerPage() {
        const w = window.innerWidth;
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        
        // 3 items for tablet/iPad landscape, 4 items for desktop or portrait
        if (w <= 1180 && isLandscape) {
            return 3;
        }
        return 4;
    }

    let itemsPerPage = getItemsPerPage();

    // 3. Screen Resize Event Handler
    window.addEventListener("resize", () => {
        const newItemsPerPage = getItemsPerPage();
        if (newItemsPerPage !== itemsPerPage) {
            itemsPerPage = newItemsPerPage;
            currentPage = 1;
            renderPage(1);
        }
    });

    if (wrapper) setTimeout(() => wrapper.classList.add("fade-in"), 100);

    // 4. Fetch User History Data
    fetch('/api/user-history')
        .then(res => res.json())
        .then(data => {
            allData = data;
            filteredData = [...allData];
            renderPage(1);
            handleURLHighlight();
        })
        .catch(() => {
            if (grid) grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: red;'>Error loading history.</p>";
        });

    // 5. Search Filter Event Listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            grid.style.opacity = "0.5";
            
            filteredData = allData.filter(item => 
                (item.item_name || "").toLowerCase().includes(term) ||
                (item.category || "").toLowerCase().includes(term) ||
                (item.location || "").toLowerCase().includes(term)
            );
            
            currentPage = 1;
            renderPage(1);
            setTimeout(() => { grid.style.opacity = "1"; }, 50);
        });
    }

    // 6. Page Render Function
    function renderPage(page) {
        currentPage = page;
        grid.innerHTML = "";
        const start = (page - 1) * itemsPerPage;
        const pageData = filteredData.slice(start, start + itemsPerPage);

        if (pageData.length === 0) {
            grid.innerHTML = "<h3 style='grid-column: 1/-1; text-align: center; padding: 50px;'>No records found.</h3>";
            paginationContainer.innerHTML = "";
            return;
        }

        pageData.forEach(item => {
            const statusClass = getStatusClass(item.status);
            const card = document.createElement("div");
            card.className = "item-card";
            card.id = `item-${item.id}`; 
            card.onclick = () => openModal(item.id);
            
            card.innerHTML = `
                <div class="card-img-container" style="background-image: url('${item.image_path || ''}');">
                    ${item.image_path ? '' : 'No Image Provided'}
                </div>
                <div class="card-content">
                    <h3>${item.item_name}</h3>
                    <hr class="title-line">
                    <span class="badge">${item.category}</span>
                    <div class="item-details">
                        <p><strong>Description:</strong> ${item.description || 'No description'}</p>
                        <p><strong>Where ${item.report_type}:</strong> ${item.location}</p>
                        <p><strong>Status:</strong> <span class="status-pill ${statusClass}">${item.status}</span></p>
                        <p><strong>Owner:</strong> ${item.contact_firstname} ${item.contact_lastname}</p>
                        <p><strong>Phone:</strong> ${item.contact_phone}</p>
                        <p><strong>Email:</strong> ${item.contact_email}</p>
                        <div class="post-time">
                            <span>Date: ${item.formattedDate}</span><br>
                            <span>Time: ${item.formattedTime}</span>
                        </div>
                    </div>
                </div>`;
            grid.appendChild(card);
        });

        grid.classList.add("rise-up");
        setupPagination();
    }

    // 7. URL Direct Link & Card Highlight Handler
    function handleURLHighlight() {
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');

        if (targetId) {
            const itemIndex = allData.findIndex(item => String(item.id) === String(targetId));
            
            if (itemIndex !== -1) {
                const targetPage = Math.floor(itemIndex / itemsPerPage) + 1;
                if (currentPage !== targetPage) renderPage(targetPage);

                setTimeout(() => {
                    const targetElement = document.getElementById(`item-${targetId}`);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetElement.classList.add('highlight-active');

                        const removeHighlight = () => {
                            targetElement.classList.remove('highlight-active');
                            targetElement.style.animation = "none";
                            document.removeEventListener('click', removeHighlight);
                        };
                        setTimeout(() => {
                            document.addEventListener('click', removeHighlight);
                        }, 100);
                    }
                }, 500);
            }
        }
    }

    // 8. Fixed Pagination Controls Generator
    function setupPagination() {
        paginationContainer.innerHTML = "";
        const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

        const prevBtn = document.createElement("button");
        prevBtn.className = "pag-btn-large";
        prevBtn.textContent = "Previous";
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = (e) => { 
            e.stopPropagation(); 
            if (currentPage > 1) { 
                currentPage--; 
                renderPage(currentPage); 
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
            } 
        };
        paginationContainer.appendChild(prevBtn);

        const pageIndicator = document.createElement("span");
        pageIndicator.className = "page-indicator";
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationContainer.appendChild(pageIndicator);

        const nextBtn = document.createElement("button");
        nextBtn.className = "pag-btn-large";
        nextBtn.textContent = "Next";
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = (e) => { 
            e.stopPropagation(); 
            if (currentPage < totalPages) { 
                currentPage++; 
                renderPage(currentPage); 
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
            } 
        };
        paginationContainer.appendChild(nextBtn);
    }

    // 9. Modal Open & Render Functions
    window.openModal = function(id) {
        const item = allData.find(i => String(i.id) === String(id));
        if (!item) return;

        const isSensitive = Boolean(item.is_sensitive_image);
        const modalImgHtml = isSensitive
            ? `<div class="card-img-wrapper sensitive-img-wrapper modal-sensitive-img">
                   <img src="${item.image_path || 'placeholder.png'}" class="sensitive-img" draggable="false" style="width:100%; border-radius:15px;">
                   <div class="sensitive-img-overlay"><i class="fas fa-eye-slash"></i><span>Blurred for privacy</span></div>
               </div>`
            : `<img src="${item.image_path || 'placeholder.png'}" style="width:100%; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;

        const body = document.getElementById("modalBody");
        if (body) {
            body.innerHTML = `
                <div class="modal-body-grid">
                    <div class="modal-col-left">
                        <div class="modal-title-header">
                            <h1 class="modal-item-title">${item.item_name}</h1>
                            <span class="status-badge-published status-pill ${getStatusClass(item.status || 'Published')}">${item.status || 'Published'}</span>
                        </div>
                        ${modalImgHtml}
                        <p style="margin-top:12px; color:#666;">Report Type: <strong>${item.report_type || 'Item'}</strong></p>
                    </div>
                    <div class="modal-col-right">
                        <h3 class="info-header">Item Information</h3>
                        <p><strong>Category:</strong> ${item.category}</p>
                        <p><strong>Location:</strong> ${item.location}</p>
                        <p><strong>Date:</strong> ${item.formattedDate}</p>
                        <p><strong>Time:</strong> ${item.formattedTime || 'N/A'}</p>
                        <h3 class="info-header" style="margin-top:20px;">Description</h3>
                        <p style="line-height:1.6;">${item.description || 'No description provided.'}</p>
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
    };

    // 10. Modal Close Handler
    window.closeModal = function() {
        const modal = document.getElementById("itemModal");
        if (modal) {
            modal.classList.remove("show");
        }
        document.body.classList.remove("item-details-modal-open");
        document.documentElement.classList.remove("item-details-modal-open");
    };

    const closeBtn = document.getElementById("closeModalBtn");
    const modal = document.getElementById("itemModal");

    if (closeBtn && modal) {
        closeBtn.addEventListener("click", closeModal);
        window.addEventListener("click", (event) => {
            if (event.target === modal) closeModal();
        });
    }
});

// 11. Periodic User Authentication Check
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
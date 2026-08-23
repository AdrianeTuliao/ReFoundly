document.addEventListener("DOMContentLoaded", () => {
        const grid = document.getElementById("history-grid");
        const paginationContainer = document.getElementById("pagination-container");
        const searchInput = document.getElementById("history-search");
        const wrapper = document.querySelector(".main-wrapper");

        let allData = [];
        let filteredData = [];
        let currentPage = 1;
        const itemsPerPage = 4; 

        if (wrapper) setTimeout(() => wrapper.classList.add("fade-in"), 100);

        // Fetch Data
        fetch('/api/user-history')
            .then(res => res.json())
            .then(data => {
                allData = data;
                filteredData = [...allData];
                renderPage(1);
            })
            .catch(err => {
                grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: red;'>Error loading history.</p>";
            });

        // Search Logic
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
        const statusClass = (item.report_type || "").toLowerCase() === 'found' ? 'status-found' : 'status-lost';
        const card = document.createElement("div");
        card.className = "item-card";
        
        // ADD THIS LINE: This allows the script to find the specific item
        card.id = `item-${item.id}`; 
        
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
                    <p><strong>Status:</strong> <span class="${statusClass}">${item.status}</span></p>
                    <p><strong>Owner:</strong> ${item.contact_firstname} ${item.contact_lastname}</p>
                    <p><strong>Phone:</strong> ${item.contact_phone}</p>
                    <p><strong>Email:</strong> ${item.contact_email}</p>
                    <div class="post-time">
                        <span>Date: ${item.formattedDate}</span><br>
                        <span>Time: ${item.formattedTime}</span>
                    </div>
                </div>
                <input type="text" class="comment-input" placeholder="Add a note...">
            </div>`;
        grid.appendChild(card);
    });

    grid.classList.add("rise-up");
    setupPagination();
}

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

                    // Function to remove highlight
                    const removeHighlight = () => {
                        targetElement.classList.remove('highlight-active');
                        targetElement.style.animation = "none";
                        // Remove the listener so it doesn't keep running
                        document.removeEventListener('click', removeHighlight);
                    };

                    // Add listener: remove light when user clicks anywhere
                    // Use a tiny timeout so the click that opened the page doesn't trigger it
                    setTimeout(() => {
                        document.addEventListener('click', removeHighlight);
                    }, 100);
                }
            }, 500);
        }
    }
}

// Update your Fetch Logic to call the highlight function
fetch('/api/user-history')
    .then(res => res.json())
    .then(data => {
        allData = data;
        filteredData = [...allData];
        renderPage(1);
        handleURLHighlight(); // This triggers the effect on page load
    })
    .catch(err => {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: red;'>Error loading history.</p>";
    });

        function setupPagination() {
            paginationContainer.innerHTML = "";
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            if (totalPages <= 1) return;

            const prevBtn = document.createElement("button");
            prevBtn.className = "pag-btn";
            prevBtn.innerHTML = "<i class='fas fa-chevron-left'></i>";
            prevBtn.onclick = () => { if(currentPage > 1) { renderPage(currentPage - 1); window.scrollTo(0,0); }};
            paginationContainer.appendChild(prevBtn);

            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement("button");
                btn.className = `pag-btn ${i === currentPage ? 'active' : ''}`;
                btn.innerText = i;
                btn.onclick = () => { renderPage(i); window.scrollTo(0,0); };
                paginationContainer.appendChild(btn);
            }

            const nextBtn = document.createElement("button");
            nextBtn.className = "pag-btn";
            nextBtn.innerHTML = "<i class='fas fa-chevron-right'></i>";
            nextBtn.onclick = () => { if(currentPage < totalPages) { renderPage(currentPage + 1); window.scrollTo(0,0); }};
            paginationContainer.appendChild(nextBtn);
        }
    });

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
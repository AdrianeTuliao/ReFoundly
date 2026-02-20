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
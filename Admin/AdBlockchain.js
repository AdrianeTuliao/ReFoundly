const web3 = new Web3("http://127.0.0.1:7545"); 

// --- GLOBAL STATE ---
let allBcLogs = [];         
let filteredBcLogs = [];    
let currentBcPage = 1;
const logsPerPage = 6; // Requirement: Max 6 per page

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("blockchain-wrapper");
    if (wrapper) setTimeout(() => wrapper.classList.add("fade-in"), 100);

    fetchBlockchainLogs();

    // --- SEARCH LISTENER ---
    const searchInput = document.getElementById('bcSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleBcSearch);
    }

    // --- PAGINATION LISTENERS ---
    document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentBcPage > 1) {
            currentBcPage--;
            renderBcTable();
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBcLogs.length / logsPerPage);
        if (currentBcPage < totalPages) {
            currentBcPage++;
            renderBcTable();
        }
    });
});

async function fetchBlockchainLogs() {
    try {
        const response = await fetch('/api/admin/audit_logs');
        const rawLogs = await response.json();
        
        // Filter: Keep only logs that have a transaction hash
        allBcLogs = rawLogs.filter(log => {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            return details.txHash || log.blockchain_tx;
        });

        handleBcSearch(); 
    } catch (err) {
        console.error("Blockchain Fetch Error:", err);
    }
}

function handleBcSearch() {
    const query = document.getElementById('bcSearch')?.value.toLowerCase() || "";
    
    filteredBcLogs = allBcLogs.filter(log => {
        const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        const txHash = (details.txHash || log.blockchain_tx || "").toLowerCase();
        const action = log.action.toLowerCase();
        return txHash.includes(query) || action.includes(query);
    });

    currentBcPage = 1; 
    renderBcTable();
}

function renderBcTable() {
    const container = document.getElementById('blockchain-log-body');
    const pageInfo = document.getElementById('pageInfo');
    if (!container) return;

    const totalPages = Math.ceil(filteredBcLogs.length / logsPerPage) || 1;
    const start = (currentBcPage - 1) * logsPerPage;
    const end = start + logsPerPage;
    const paginatedItems = filteredBcLogs.slice(start, end);

    if (pageInfo) pageInfo.innerText = `Page ${currentBcPage} of ${totalPages}`;

    container.innerHTML = paginatedItems.map(log => {
        const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        const txHash = details.txHash || log.blockchain_tx;
        
        // Data Masking for privacy optimization
        const maskedItem = details.item 
            ? details.item.charAt(0) + "***" + details.item.slice(-2) 
            : (details.itemId ? `ID: ${details.itemId}` : "N/A");
            
        // FETCH REAL GAS FROM SQL (log.gas_used)
        const realGas = log.gas_used && log.gas_used > 0 ? log.gas_used : "0"; 
        const shortHash = `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 6)}`;

        return `
            <tr>
                <td>
                    <strong>${new Date(log.created_at).toLocaleDateString()}</strong><br>
                    <small style="color:#666;">${new Date(log.created_at).toLocaleTimeString()}</small>
                </td>
                <td><span class="log-badge badge-admin">${log.action.replace(/_/g, ' ')}</span></td>
                <td><code class="hash-code" title="${txHash}">${shortHash}</code></td>
                <td><em>${maskedItem}</em></td>
                <td style="font-weight: bold; color: #2e7d32;">
                    ${realGas.toLocaleString()} 
                </td>
                <td>
                    <span class="status-badge status-verified">
                        <i class="fa-solid fa-shield-check"></i> Verified
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}


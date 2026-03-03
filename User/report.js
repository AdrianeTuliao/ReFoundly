// Blockchain Connections 
const web3 = new Web3("http://127.0.0.1:7545");
const contractAddress = "0xd920b4Ad789Dc5ceAbd59DfF1427912153deaD73";
const contractABI = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "uint256", "name": "id", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "title", "type": "string" },
            { "indexed": false, "internalType": "address", "name": "reporter", "type": "address" }
        ],
        "name": "ReportLogged",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_id", "type": "uint256" }, 
            { "internalType": "string", "name": "_title", "type": "string" },
            { "internalType": "string", "name": "_category", "type": "string" },
            { "internalType": "string", "name": "_location", "type": "string" }
        ],
        "name": "createReport",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_id", "type": "uint256" }],
        "name": "markAsResolved",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "reports",
        "outputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "string", "name": "itemTitle", "type": "string" },
            { "internalType": "string", "name": "category", "type": "string" },
            { "internalType": "string", "name": "location", "type": "string" },
            { "internalType": "address", "name": "reporter", "type": "address" },
            { "internalType": "bool", "name": "isResolved", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalReports",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
];

const myContract = new web3.eth.Contract(contractABI, contractAddress);

/* IMAGE PREVIEW LOGIC */
const fileInput = document.getElementById('file-upload');
const uploadBox = document.querySelector('.image-upload-box');

fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadBox.style.backgroundImage = `url('${e.target.result}')`;
            uploadBox.style.backgroundSize = 'cover'; 
            uploadBox.style.backgroundRepeat = 'no-repeat';
            uploadBox.style.backgroundPosition = 'center';
            
            const icon = uploadBox.querySelector('i');
            const text = uploadBox.querySelector('p');
            if(icon) icon.style.display = 'none';
            if(text) text.style.display = 'none';
        }
        reader.readAsDataURL(this.files[0]);
    }
});

/* FORM SUBMISSION LOGIC */
document.getElementById('mainForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    const submitBtn = document.getElementById('btnSubmit');
    const itemName = document.getElementById('itemName').value;
    const category = document.querySelector('select[name="category"]').value;
    const location = document.getElementById('locationSelect').value;

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ Saving to Database...";

        const csrfResponse = await fetch('/api/csrf-token');
        const { csrfToken } = await csrfResponse.json();

        const formData = new FormData(this);
        const response = await fetch('/submit-report', { 
            method: 'POST',
            body: formData,
            headers: { 
                'CSRF-Token': csrfToken,
                'Accept': 'application/json'
            }
        });

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server session expired or internal error");
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Server Error");

        const realId = result.itemId; 

        /* STEP 2: BLOCKCHAIN ANCHORING (PRODUCTION MODE) */
        submitBtn.innerText = "🔗 Anchoring to Blockchain...";
        const accounts = await web3.eth.getAccounts();
        const activeWallet = accounts[0]; 

        // Match realId from MySQL to the Blockchain ID
        const receipt = await myContract.methods
            .createReport(Number(realId), itemName, category, location)
            .send({ 
                from: activeWallet, 
                gas: 300000 
            });

        /* STEP 3: SYNC DATABASE & AUDIT LOG */
        const updateRes = await fetch('/api/update-tx', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'CSRF-Token': csrfToken 
            },
            body: JSON.stringify({
                itemId: realId,
                txHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString() 
            })
        });

        if (!updateRes.ok) console.warn("Blockchain synced, but Audit Logging failed.");

        alert("Success! Report secured on DB and Blockchain.");
        window.location.href = "/dashboard.html";

    } catch (error) {
        console.error("Submission Error:", error);
        alert("Submission Failed: " + error.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Report";
    }
});

/* AUTO-FILL & SESSION LOGIC */
window.onload = async () => {
    try {
        const response = await fetch('/user/me');
        if (response.ok) {
            const user = await response.json();
            if (user.name && user.name.includes(',')) {
                const parts = user.name.split(',');
                document.getElementsByName('lastName')[0].value = parts[0].trim();
                document.getElementsByName('firstName')[0].value = parts[1].trim();
            } else {
                document.getElementsByName('firstName')[0].value = user.name || '';
            }
            document.getElementsByName('email')[0].value = user.email || '';
            document.getElementsByName('phoneNumber')[0].value = user.contact_number || '';
        }
    } catch (error) {
        console.log("Session inactive.");
    }
};

function checkSession() {
    fetch('/user/me').then(response => {
        if (response.status === 401) {
            const modal = document.getElementById('session-alert');
            if (modal) modal.style.display = 'flex';
        }
    }).catch(() => console.log("Connection lost."));
}
setInterval(checkSession, 10000);
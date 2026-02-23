// Blockchain Connections 
const web3 = new Web3("http://127.0.0.1:7545");
const contractAddress = "0x476893BF34ac2e30259b51B1B08809eE6860F2b5";
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

/* FORM SUBMISSION (BLOCKCHAIN + DATABASE) */
document.getElementById('mainForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    
    const submitBtn = document.getElementById('btnSubmit');
    const itemName = document.getElementById('itemName').value;
    const category = document.querySelector('select[name="category"]').value;
    const location = document.querySelector('input[name="location"]').value;

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ Confirming on Blockchain...";

        // GET CSRF TOKEN FOR SECURE SERVER COMMUNICATION
        const csrfResponse = await fetch('/api/csrf-token');
        const { csrfToken } = await csrfResponse.json();

        // GANACHE WALLET INTERACTION
        const accounts = await web3.eth.getAccounts();
        const userWallet = accounts[0]; 
        
        // SMART CONTRACT INTERACTION
        const receipt = await myContract.methods.createReport(itemName, category, location)
            .send({ from: userWallet, gas: 300000 });

        const txHash = receipt.transactionHash;
        console.log("Blockchain Success! TX:", txHash);
        
        // PREPARE FORM DATA FOR SERVER
        const formData = new FormData(this);
        formData.append('txHash', txHash);
        formData.append('walletAddress', userWallet);

        submitBtn.innerText = "💾 Saving to Audit Logs...";

        // POST to Server with CSRF Token
        const response = await fetch('/submit-report', { 
            method: 'POST',
            body: formData,
            headers: {
                'CSRF-Token': csrfToken
            }
        });

		// HANDLE SERVER RESPONSE
        if (response.ok) {
            const result = await response.json(); 
            alert("Report submitted and logged to Blockchain!");
            window.location.href = "/dashboard.html"; 
        } else {
            throw new Error("Server processed the request but returned an error.");
        }

    } catch (error) {
        console.error("Submission Error:", error);
        alert("Error: " + error.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Report";
    }
});

/* AUTO-FILL & SESSION */
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
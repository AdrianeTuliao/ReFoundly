// Blockchain.js

// 1. Initialize Web3 connection to Ganache
const web3 = new Web3("http://127.0.0.1:7545"); 

// 2. Paste your Contract Address here (from Remix)
const contractAddress = "0xAcd6A0620B7b624Ebb554608018dC10bbd990Bb7"; // <--- CHANGE THIS after deploying in Remix

// 3. Paste your ABI here (from Remix - it looks like a big JSON array)
const contractABI = [ [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "title",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "reporter",
				"type": "address"
			}
		],
		"name": "ReportLogged",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_title",
				"type": "string"
			}
		],
		"name": "createReport",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_id",
				"type": "uint256"
			}
		],
		"name": "markAsResolved",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "reports",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "itemTitle",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "reporter",
				"type": "address"
			},
			{
				"internalType": "bool",
				"name": "isResolved",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalReports",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
] ];

// 4. Create the Contract Instance
const myContract = new web3.eth.Contract(contractABI, contractAddress);

// --- TEST FUNCTION 1: CHECK CONNECTION ---
async function checkConnection() {
    try {
        const accounts = await web3.eth.getAccounts();
        document.getElementById("status").innerText = "Connected! Admin Wallet: " + accounts[0];
        document.getElementById("status").style.color = "green";
        return accounts[0];
    } catch (error) {
        document.getElementById("status").innerText = "Connection Failed: " + error.message;
        document.getElementById("status").style.color = "red";
    }
}

// --- TEST FUNCTION 2: ADD REPORT (Write to Blockchain) ---
async function addReportToChain(itemName) {
    const accounts = await web3.eth.getAccounts();
    const admin = accounts[0]; // We use the first Ganache account as the Admin
    
    document.getElementById("logs").innerHTML += `<li>⏳ Sending "${itemName}" to Blockchain...</li>`;

    try {
        // Call the 'createReport' function from your Solidity code
        await myContract.methods.createReport(itemName).send({ from: admin, gas: 300000 });
        
        document.getElementById("logs").innerHTML += `<li>✅ Transaction Mined! Item stored on-chain.</li>`;
        
        // Refresh the counter
        getTotalReports();
    } catch (error) {
        console.error(error);
        document.getElementById("logs").innerHTML += `<li>❌ Error: ${error.message}</li>`;
    }
}

// --- TEST FUNCTION 3: READ REPORT (Read from Blockchain) ---
async function getTotalReports() {
    try {
        const total = await myContract.methods.totalReports().call();
        document.getElementById("chainCount").innerText = total;
    } catch (error) {
        console.error(error);
    }
}
/*********************************************************************************
* The MIT License (MIT)                                                          *
*                                                                                *
* Copyright (c) 2022 KMi, The Open University UK                                 *
*                                                                                *
* Permission is hereby granted, free of charge, to any person obtaining          *
* a copy of this software and associated documentation files (the "Software"),   *
* to deal in the Software without restriction, including without limitation      *
* the rights to use, copy, modify, merge, publish, distribute, sublicense,       *
* and/or sell copies of the Software, and to permit persons to whom the Software *
* is furnished to do so, subject to the following conditions:                    *
*                                                                                *
* The above copyright notice and this permission notice shall be included in     *
* all copies or substantial portions of the Software.                            *
*                                                                                *
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR     *
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,       *
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL        *
* THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER     *
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,  *
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN      *
* THE SOFTWARE.                                                                  *
*                                                                                *
**********************************************************************************/

const STORE_NAME = 'CommunicaTest3';

let linkchains = {}
let ethereum = {}
let account = "";
let contractcache = {};

let provider = {};
let signer = {};

/**
 * Initialise page - load any stored data from browser storage.
 */
function initApp() {

	/** load any stored hashes onto the screen **/
	if (window.localStorage.getItem(STORE_NAME)) {
		loadStoredData();
	} else {
		// setup an empty hash store
		window.localStorage.setItem(STORE_NAME, '[]');
	}

	// reference linkchains
	linkchains = window.linkchains();
	console.log(linkchains);

	// connect this webpage to ethereum through metamask
	setUpEthereumAndMetamask();

	// Wire up the read from file buttons
	const readRDFInputFileButton = document.querySelector("#readRDFInputFileButton");
	readRDFInputFileButton.onclick = async function() {
		readLocalInputData('RDFInputFile', 'queryRDFInputArea', []);
	};

	const readAnchoredMetadataButton = document.querySelector("#readAnchoredMetadataButton");
	readAnchoredMetadataButton.onclick = async function() {
		readLocalInputData('anchoredMetadataFile', 'anchoredMetadataInputArea', []);
	};
}


/**
 * Setup ethereum and metmask.
 */
async function setUpEthereumAndMetamask() {
	ethereum = window.ethereum;

	// A Web3Provider wraps a standard Web3 provider, which is
	// what MetaMask injects as window.ethereum into each page
	provider = new ethers.providers.Web3Provider(window.ethereum)
	console.log('provider:', provider);

	// The MetaMask plugin also allows signing transactions to
	// send ether and pay to change state within the blockchain.
	// For this, you need the account signer...
	signer = provider.getSigner();
	console.log('signer:', signer);

	// Check if logged into MetaMask already
	if (typeof ethereum !== 'undefined') {

		// detect Network change and reassign provider and signer
		ethereum.on('chainChanged', async function() {
			provider = new ethers.providers.Web3Provider(window.ethereum)
			console.log('provider:', provider);
			signer = provider.getSigner();
			console.log('signer:', signer);
		});

		// detect an account change
		ethereum.on("accountsChanged", () => {
			if (account != ethereum.selectedAddress) {
				account = ethereum.selectedAddress;
				document.getElementById('ethereumaccount').innerHTML = account;
			}
		});

		if (ethereum.isMetaMask) {
			console.log('MetaMask is installed');
		}

		if (ethereum.selectedAddress == "" || ethereum.selectedAddress == null) {
			const button = document.getElementById('enableEthereumButton');
			button.disabled = false;
		} else {
			const button = document.getElementById('enableEthereumButton');
			button.disabled = true;
			enableMetaMaskButtons();
			account = ethereum.selectedAddress;
			document.getElementById('ethereumaccount').innerHTML = account;
		}
	} else {
		const button = document.getElementById('enableEthereumButton');
		button.disabled = false;
		console.log('MetaMask needs to be installed');
	}
}

/**
 * Start the metamask extension for user to login.
 */
async function loginToMetaMask() {

	let reply = await ethereum.request({ method: 'eth_requestAccounts' });

	if (ethereum.selectedAddress) {
		const button = document.getElementById('enableEthereumButton');
		button.disabled = true;

		enableMetaMaskButtons();

		account = ethereum.selectedAddress;
		document.getElementById('ethereumaccount').innerHTML = account;
	} else {
		alert("Please select a MetaMask account to use with this page");
	}
}

/**
 * Ask MetaMask for the details of the current network selected.
 */
async function getNetwork() {
	try {
		// get the chain id of the current blockchain your wallet is pointing at.
		const chainId = await signer.getChainId();
		//console.log(chainId);

		// get the network details for the given chain id.
		const network = await provider.getNetwork(chainId);
		//console.log(network);

		return network;
	} catch (e) {
		throw e;
	}
}

/**
 * Ask MetaMask to switch to the network in the networkObj passed in.
 */
async function switchNetwork(networkObj) {
	try {
		let chainId = networkObj.chainId;
		chainId = parseInt(chainId);
		const hexChainId = ethers.utils.hexValue(chainId);

		await ethereum.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: hexChainId}],
		});

		provider = new ethers.providers.Web3Provider(window.ethereum)
		console.log('provider:', provider);
		signer = provider.getSigner();
		console.log('signer:', signer);
		//await selectNetwork();

	} catch (switchError) {
		// This error code indicates that the chain has not been added to MetaMask.
		console.log(switchError);
		if (switchError.code === 4902) {
			throw new Error("The required network is not available in your MetaMask, please add: "+networkObj.name);
		} else {
			throw new Error("Failed to switch to the network");
		}
	}
}

/**
 * Enable metamask dependent buttons after connected to Metamask
 */
function enableMetaMaskButtons() {

	const verifyButton = document.getElementById('verifyButton');
	verifyButton.disabled = false;
}

/**
 * Load RDF data from select file
 */
async function readLocalInputData(filefieldname, inputareaname, prefillAreasArray) {

	var filefield = document.getElementById(filefieldname);
	if (filefield) {
		var file = filefield.files[0];
		if (file) {
			var reader = new FileReader();

			reader.addEventListener("load", async () => {
				let input = reader.result;

				const inputarea = document.getElementById(inputareaname);
				inputarea.value = input;

				prefillAreasArray.forEach(function(elementname) {
					const nextelement = document.getElementById(elementname);
					nextelement.value = input;
				});
			}, false);

			reader.addEventListener('error', () => {
				console.error(`Error occurred reading file: ${file.name}`);
			});

			reader.readAsText(file);
		} else {
			alert("Please select a file first");
		}
	} else {
		alert("Please select a file first");
	}
}

async function verifyQuery() {

	let options = {}
	const verifyResults = document.getElementById('verifyResults');

	try {
		const queryRDFInputArea = document.getElementById('queryRDFInputArea');
		let rdfInputData = "";
		if (queryRDFInputArea.value != "" && queryRDFInputArea.value != null) {
			rdfInputData = queryRDFInputArea.value;
		} else {
			alert("Please load the query RDF data to verify");
			return;
		}

		const anchoredMetadataInputArea = document.getElementById('anchoredMetadataInputArea');
		let granularAnchoredData = "";
		if (anchoredMetadataInputArea.value != "" && anchoredMetadataInputArea.value != null) {
			granularAnchoredData = anchoredMetadataInputArea.value
		} else {
			alert("Please load the anchored metadata to use for verification");
			return;
		}

		verifyResults.value = "Depending on the input size, this can take a while. Please wait...";

		const handler = async function(anchor, options) {
			let reply = await readMerQLAnchorContract(anchor, options);
			//console.log(reply);
			return reply;
		}
		const output = await linkchains.verify(rdfInputData, granularAnchoredData, options, handler);

		verifyResults.value = JSON.stringify(output, null, 2);

	} catch (e) {
		console.log(e);
		verifyResults.value = e.message;
	}
}

/*** HELPER FUNCTIONS ***/

async function readMerQLAnchorContract(anchor, option) {

	const currentNetwork = await getNetwork();
	delete currentNetwork._defaultProvider; // we don't want that bit

	if (anchor.network && anchor.network.name != currentNetwork.name) {
		//alert("Please switch networks. This data was anchored on: "+anchor.network.name);
		//throw new Error("Wrong network detected to verify against");
		await switchNetwork(anchor.network);
	}

	contractAddress = anchor.address;

	// check if it cached first
	if (contractcache[contractAddress] !== undefined) {
		return contractcache[contractAddress];
	}

	const verifyResults = document.getElementById('verifyResults');
	const abi = contract.MerQLAnchorContract.abi;

	try {
		const theContract = new ethers.Contract(contractAddress, abi, provider);
		let data = await theContract.getData();

		// this is needed as the returned data object is sort of an array - despite what this code may imply.
		const dataObj = {
			leastSignificants: parseInt(data.leastSignificants.toString()),
			theCreationTime: data.theCreationTime.toString(),
			theDivisor: parseInt(data.theDivisor.toString()),
			theIndexHashFunction: data.theIndexHashFunction.toString(),
			theIndexType: data.theIndexType.toString(),
			theOwner: data.theOwner.toString(),
			theQuadHashFunction: data.theQuadHashFunction.toString(),
			theTreeHashFunction: data.theTreeHashFunction.toString(),
			thetargetHash: data.thetargetHash.toString(),
		}

		// get the transaction
		const receipt = await provider.getTransactionReceipt(anchor.transactionHash);
		dataObj.transactionAccount = receipt.from;
		dataObj.transactionContractAddress = receipt.contractAddress;

		// add the network to the reply.
		if (anchor.network) {
			dataObj.network = anchor.network;
		}

		contractcache[contractAddress] = dataObj;

		return dataObj;

	} catch (e) {
		console.log(e);
		verifyResults.value = e;
	}
}

/*** LOCAL DATA STORAGE FUNCTIONS ***/

/**
 * Load any previously stored local data
 */
function loadStoredData() {

	var storedDataTable = document.getElementById("storedDataTable");
	// empty any old data on screen
	storedDataTable.innerHTML = "";

	var dataDetailsArray = JSON.parse(window.localStorage.getItem(STORE_NAME));
	if (!dataDetailsArray) {
		dataDetailsArray = [];
	}

	var count = dataDetailsArray.length;
	for (var i=0; i<count; i++) {
		var next = dataDetailsArray[i];

		// Create an empty <tr> element and add it to the 1st position of the table:
		var row = storedDataTable.insertRow(i);

		// Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
		const dateColumn = row.insertCell(0);
		const sourceColumn = row.insertCell(1);
		const queryColumn = row.insertCell(2);
		const resultColumn = row.insertCell(3);
		const anchoredDataColumn = row.insertCell(4);
		const anchoredColumn = row.insertCell(5);
		const granularAnchoredColumn = row.insertCell(6);
		const verifyColumn = row.insertCell(7);

		// Add some text to the new cells:
		dateColumn.innerHTML = (new Date(next.date)).toLocaleDateString('en-GB')+" - "+(new Date(next.date)).toLocaleTimeString('en-GB');
		sourceColumn.innerHTML = '<a href="'+next.sourceURL+'" target="_blank">'+next.sources+'</a>';

		let queryButton = document.createElement("button");
		queryButton.innerHTML = "View Query";
		queryButton.className = "button";
		queryButton.data = next.query;
		queryButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
  			popupText.value = this.data;
  			popup.style.visibility = "visible";
		};
		queryColumn.appendChild(queryButton);

		let resultButton = document.createElement("button");
		resultButton.innerHTML = "View Query Results";
		resultButton.className = "button";
		resultButton.data = next.queryResults;
		resultButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
  			popupText.value = this.data;
  			popup.style.visibility = "visible";
		};
		resultColumn.appendChild(resultButton);

		let anchoredDataButton = document.createElement("button");
		anchoredDataButton.innerHTML = "View Anchored RDF";
		anchoredDataButton.className = "button";
		anchoredDataButton.data = next.anchoredData;
		anchoredDataButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			var obj = JSON.parse(this.data);
  			popupText.value = this.data //JSON.stringify(obj, null, 2);
  			popup.style.visibility = "visible";
		};
		anchoredDataColumn.appendChild(anchoredDataButton);

		let anchoredButton = document.createElement("button");
		anchoredButton.innerHTML = "View Anchored MetaData";
		anchoredButton.className = "button";
		anchoredButton.data = next.anchoredResults;
		anchoredButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			var obj = JSON.parse(this.data);
  			popupText.value = JSON.stringify(obj, null, 2);
  			popup.style.visibility = "visible";
		};
		anchoredColumn.appendChild(anchoredButton);

		let granularAnchoredButton = document.createElement("button");
		granularAnchoredButton.innerHTML = "View Granular MetaData";
		granularAnchoredButton.className = "button";
		granularAnchoredButton.data = next.granularAnchoredResults;
		granularAnchoredButton.onclick = function () {
			var popup = document.getElementById("popupDiv");
			var popupText = document.getElementById("popupText");
			var obj = JSON.parse(this.data);
  			popupText.value = JSON.stringify(obj, null, 2);
  			popup.style.visibility = "visible";
		};
		granularAnchoredColumn.appendChild(granularAnchoredButton);

		let verifyButton = document.createElement("button");
		verifyButton.innerHTML = "Load this Data";
		verifyButton.className = "button";
		verifyButton.data = {"source": next.anchoredData, "meta": next.granularAnchoredResults };
		verifyButton.onclick = function () {
			document.getElementById('queryRDFInputArea').value = this.data.source;
			document.getElementById('anchoredMetadataInputArea').value = this.data.meta;
		};
		verifyColumn.appendChild(verifyButton);
	}

}

/**
 * Close data popup
 */
function closePopup() {
	var popup = document.getElementById("popupDiv");
	popup.style.visibility = "hidden";
}

/**
 * Copy popup contents to system Clipboard
 */
function copyToClipboard() {
	var popupText = document.getElementById("popupText");
	navigator.clipboard.writeText(popupText.innerHTML);
}

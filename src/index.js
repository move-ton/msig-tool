import { TONClient, setWasmOptions } from 'ton-client-web-js';
const msigAbi = require('./SafeMultisigWallet.abi.json');

// Storage

function getKeys() {
	return {
		public: localStorage.getItem('msig-tool-pubkey') || null,
		secret: localStorage.getItem('msig-tool-privkey') || null
	}
}

function storeKeys(kp) {
	localStorage.setItem('msig-tool-pubkey', kp.public);
	localStorage.setItem('msig-tool-privkey', kp.secret);
}

function clearKeys() {
	localStorage.remove('msig-tool-pubkey');
	localStorage.remove('msig-tool-privkey');
}

// DOM

function clearHTML(elId) {
	let el = document.getElementById(elId);
	el.innerHTML = "";
}

function addHTML(elId, message) {
	let el = document.getElementById(elId);
    el.insertAdjacentHTML("beforeend", `<p>${message}</p>`);
}

function display(elId, display) {
	let el = document.getElementById(elId);
	el.style.display = display ? 'block' : 'none';
}

function showLoginInfo() {
	clearHTML('logged-in')
	let kp = getKeys();
	if (!kp) {
		addHTML('logged-in', 'Not Logged In');
	}
	else {
		addHTML('logged-in', `Logged in as ${kp.public}.`)
	}
}

// TON OS

async function keyPairFromPhrase(client, phrase) {
	const HD_PATH = "m/44'/396'/0'/0/0";
	const SEED_PHRASE_WORD_COUNT = 12;
	const SEED_PHRASE_DICTIONARY_ENGLISH = 1;
	let keyPair = await client.crypto.mnemonicDeriveSignKeys({
            dictionary: SEED_PHRASE_DICTIONARY_ENGLISH,
            wordCount: SEED_PHRASE_WORD_COUNT,
            phrase: phrase,
            path: HD_PATH
        });
	return keyPair;
};

async function getCustodians(client, address) {
	const response = await client.contracts.runLocal({
		    address: address,
		    abi: msigAbi,
		    functionName: 'getCustodians',
		    input: {}
		});
	return response.output.custodians
}

async function getTransactions(client, address) {
	const response = await client.contracts.runLocal({
		    address: address,
		    abi: msigAbi,
		    functionName: 'getTransactions',
		    input: {}
		});
	return response.output.transactions
}

async function submitTransaction(client, addressFrom, addressTo, value, kp) {
	const response = await client.contracts.run({
		address: addressFrom,
		abi: msigAbi,
		functionName: 'submitTransaction',
		input: {
			dest: addressTo,
			value: value,
			bounce: false,
			allBalance: false,
			payload: ""
		},
		keyPair: kp
	})
	console.log(response);
	return response.output.transId
}

async function confirmTransaction(client, addressFrom, txid, kp) {
	const response = await client.contracts.run({
		address: addressFrom,
		abi: msigAbi,
		functionName: 'confirmTransaction',
		input: {
			transactionId: txid
		},
		keyPair: kp
	});
	console.log(response);
	return response
}

// main

window.addEventListener('load', () => {
    (async () => {
    	showLoginInfo();
    	display('resp-custodians', false);
    	display('content-signtx', false);
    	display('ui-createtx', false);

        const client = await TONClient.create({
            servers: ['net.ton.dev']
        });
        // exhaust indicate color target want model cry garbage range write light flee - 82fc180e86668f31e7a11aa64bb0fb68129979abd5a4f9ab8420179d3c864d2f
        // fire gaze canyon slot maid science twenty shuffle arch episode wet rude - ab81ebc2833c1d58524baac1b72ca731d62cc8bb4abccc07a15826e03e336bf6
        const loginBtn = document.getElementById('login');
        const logoutBtn = document.getElementById('logout');
        const addressInput = document.getElementById('address');
        const custodiansBtn = document.getElementById('custodians');
        const listtxBtn = document.getElementById('listtx');
        const signtxBtn = document.getElementById('signtx');
        const createtxBtn = document.getElementById('createtx');
        const submittxBtn = document.getElementById('submittx');

        addressInput.value = '0:fb47c850a5d38287d09ce4f7c29e41dcceb78b27bef10f47c0eed62a6bd67e89'
        
        loginBtn.addEventListener('click', async () => {
        	const phrase = document.getElementById('phrase').value;
        	let kp = await keyPairFromPhrase(client, phrase);
        	storeKeys(kp);
        	showLoginInfo();
        });

        logoutBtn.addEventListener('click', () => {
        	clearKeys();
        	showLoginInfo();
        })

        custodiansBtn.addEventListener('click', async () => {
	    	display('content-signtx', false);
	    	display('ui-createtx', false);

        	let custodians = await getCustodians(client, addressInput.value);
        	clearHTML('resp-custodians');
        	addHTML('resp-custodians', "------ CUSTODIAN PUB KEYS ------");
        	for (let cust of custodians) {
        		addHTML('resp-custodians', cust.pubkey);
        	};
        	display('resp-custodians', true);
        })

        listtxBtn.addEventListener('click', async () => {
        	display('resp-custodians', false);
    		display('ui-createtx', false);

        	let transactions = await getTransactions(client, addressInput.value);
        	console.log(transactions);
        	clearHTML('resp-listtx');
        	addHTML('resp-listtx', "------ TRANSACTIONS ------");
        	for (let tx of transactions) {
        		let amount = parseInt(tx.value, 16) / 1000000000
        		addHTML('resp-listtx', `${tx.id}: ${amount} 💎 -> ${tx.dest}`)
        	}
        	display('content-signtx', true);
        })

        signtxBtn.addEventListener('click', async () => {
        	let txid = document.getElementById('txid').value;
        	let resp = await confirmTransaction(client, addressInput.value, txid, getKeys());
        })

        createtxBtn.addEventListener('click', () => {
        	display('resp-custodians', false);
    		display('content-signtx', false);
        	display('ui-createtx', true);
        })

        submittxBtn.addEventListener('click', async () => {
        	let amount = Number(document.getElementById('amount').value) * 1000000000
        	let addressTo = document.getElementById('addressTo').value
        	let tid = await submitTransaction(client, addressInput.value, addressTo, amount, getKeys());
        	addHTML('ui-createtx', `Tx ID: ${tid}`)
        })
    })();
});

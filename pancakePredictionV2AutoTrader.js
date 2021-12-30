let WalletProvider = require("truffle-hdwallet-provider");
let Web3 = require("web3");
let config = require("./config");

require("./abi/PancakePredictionV2")

let provider;
let web3;
let pancakePrediction;

async function initWallet() {
    provider = new WalletProvider(config.account, config.targetUrl);
    web3 = new Web3(provider);
}

async function loadPancakePredictionV2() {
    pancakePrediction = new web3.eth.Contract(ABIS.PancakePredictionV2, "0x18b2a687610328590bc8f2e5fedde3b582a49cda");
}

let main = async() => {
    await initWallet();
    await loadPancakePredictionV2();

    // currentEpoch
    let currentEpoch = await pancakePrediction.methods.currentEpoch().call();

    // 下注下跌
    let betRet = await pancakePrediction.methods.betBear(currentEpoch).send({from:provider.addresses[0], value:web3.utils.toWei('0.1', 'ether')});
    console.log(betRet);

    // 下注上涨
    // await pancakePrediction.methods.betBull(currentEpoch).send({value:web3.utils.toWei('0.1', 'ether')});


    // 提取资金
    // await pancakePrediction.methods.claim([currentEpoch]).send();
}

main();

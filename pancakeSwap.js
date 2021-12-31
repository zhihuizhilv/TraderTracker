let WalletProvider = require("truffle-hdwallet-provider");
let Web3 = require("web3");
let config = require("./config");

require("./abi/ERC20")
require("./abi/PancakeRouter")

let provider;
let web3;
let pancakeRouter;
let usdt;

const PancakeRouterAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const USDTAddr = "0x55d398326f99059fF775485246999027B3197955";
const WBNBAddr = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";

async function initWallet() {
    provider = new WalletProvider(config.account, config.targetUrl);
    web3 = new Web3(provider);
}

async function loadPancakeRouter() {
    pancakeRouter = new web3.eth.Contract(ABIS.PancakeRouter, PancakeRouterAddr);
}

async function loadUSDT() {
    usdt = new web3.eth.Contract(ABIS.ERC20, USDTAddr);
}

async function sleepTimer(timeout) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, timeout);
    });
}


let main = async() => {
    await initWallet();
    await loadPancakeRouter();
    await loadUSDT();

    console.log("init finish");

    // BNB balance
    let bnbBalance = await web3.eth.getBalance(provider.addresses[0]);
    console.log("BNB balance:", web3.utils.fromWei(bnbBalance));

    // USDT balance
    let usdtBalance = await usdt.methods.balanceOf(provider.addresses[0]).call();
    console.log("USDT balance:", web3.utils.fromWei(usdtBalance));

    // swap 300 USDT --> BNB
    await usdt.methods.approve(PancakeRouterAddr, web3.utils.toWei("100000000000")).send({from: provider.addresses[0]});
    await pancakeRouter.methods.swapExactTokensForETH(
        web3.utils.toWei("300"),
        0,
        [USDTAddr, WBNBAddr],
        provider.addresses[0],
        Date.now()/1000+60*1000
    ).send({from:provider.addresses[0]});


    // swap 1 BNB --> USDT
    await pancakeRouter.methods.swapETHForExactTokens(
        0,
        [WBNBAddr, USDTAddr],
        provider.addresses[0],
        Date.now()/1000+60*1000
    ).send({from:provider.addresses[0], value:web3.utils.toWei("1")});

}

main();

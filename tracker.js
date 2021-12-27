let WalletProvider = require("truffle-hdwallet-provider");
let Web3 = require("web3");
let BigNumber = require("bignumber");
let fs = require("fs");
let config = require("./config");
const axios = require('axios')

require("./abi/ERC20")

let provider;
let web3;

let tokenSkipList;
let tokenCache;

async function initTokenList() {
    tokenSkipList = new Map();
    tokenSkipList.set("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", "BUSD")

    tokenCache = new Map();
}

async function getDataFilePath() {
    return './tracker_' + config.account + '_' + Date.now().toString() + '.log';
}

async function initDataFile(filePath) {
    fs.appendFileSync(filePath, '[');
}

async function writeOneEvent(filePath, event) {
    fs.appendFileSync(filePath, JSON.stringify(event));
    fs.appendFileSync(filePath, ',\n');
}

async function getLogs(web3, startBlock, endBlock, topics) {
    let pastLogs = await web3.eth.getPastLogs({
        "fromBlock": startBlock,
        "toBlock": endBlock,
        "topics": topics,
    });

    return pastLogs;
}

async function blockTimer(timeout) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, timeout);
    });
}

async function getTokenSymbol(tokenAddr) {
    let symbol = tokenCache.get(tokenAddr);
    if (symbol != null) {
        return symbol;
    }

    let erc20 = new web3.eth.Contract(ABIS.ERC20, tokenAddr);
    symbol = await erc20.methods.symbol().call();
    tokenCache.set(tokenAddr, symbol);
    return symbol;
}

async function postMsg(msgs) {
    let msgText = "Wealth" + JSON.stringify(msgs);

    let dataObj = {"msgtype": "text",
        "text": {
            "content": msgText
        }
    };

    let data = JSON.stringify(dataObj);
    console.log(data);

    let cfg = {
        headers: {
            "Content-Type": "application/json",
        }
    }

    await axios.post(config.postMsgUrl, data, cfg)
    //     .then(res => {
    //     console.log(`状态码: ${res.statusCode}`)
    //     console.log(res)
    // })
    //     .catch(error => {
    //         console.error(error)
    //     })
}

async function getBlockTimeFromBlockNumber(blocknumber) {
    let block = await web3.eth.getBlock(blocknumber);
    let time = new Date(block.timestamp*1000);
    // let y = time.getFullYear();
    let m = time.getMonth()+1;
    let d = time.getDate();
    let h = time.getHours();
    let mm = time.getMinutes();
    let s = time.getSeconds();
    return  m + '-' + d + ' ' + h + ':' + mm + ':' + s;
}


let main = async() => {
    await initTokenList();

    provider = new WalletProvider(config.account, config.targetUrl);
    web3 = new Web3(provider);

    let erc20 = new web3.eth.Contract(ABIS.ERC20, "0x0000000000000000000000000000000000000000");
    let transferEvent = erc20._jsonInterface.find(
        o => o.name === 'Transfer' && o.type === 'event',
    );

    let buyTopics = [
        transferEvent.signature,
        null,
        config.traders
    ];

    let sellTopics = [
        transferEvent.signature,
        config.traders
    ];

    let currBnStep;
    let new_block = fs.readFileSync("new_block.txt");
    let lastBn = Number(new_block.toString());

    let dataFile = await getDataFilePath();
    await initDataFile(dataFile);

    while (true) {
        console.log("loop once");
        let currBn = await web3.eth.getBlockNumber();
        if (lastBn + 3 > currBn) {
            console.log("sleep, wait 6 second");
            await blockTimer(10*1000);
            continue;
        }

        try {
            currBnStep = lastBn + 100;
            if(currBnStep > currBn){
                currBnStep = currBn;
            }

            console.log("lastBn", lastBn, "currBnStep", currBnStep)

            let msgs = [];


            let blockTimeMap = new Map();


            // sell
            {
                let logs = await getLogs(
                    web3,
                    lastBn+1,
                    currBnStep,
                    sellTopics
                );

                for (let i = 0; i < logs.length; i++) {
                    let tokenSymbol = tokenSkipList.get(logs[i].address);
                    if (tokenSymbol == null) {
                        let datetime = await getBlockTimeFromBlockNumber(logs[i].blockNumber);
                        blockTimeMap[logs[i].blockNumber] = datetime;

                        let log = web3.eth.abi.decodeLog(transferEvent.inputs, logs[i].data, logs[i].topics.slice(1));
                        tokenSymbol = await getTokenSymbol(logs[i].address);
                        let msg = datetime + " " + log.from + " 卖:" +  tokenSymbol + " (" + logs[i].address + ") " + web3.utils.fromWei(log.value) + "个";
                        msgs.push(msg);
                        console.log(msg);
                        await writeOneEvent(dataFile, log);
                    }
                }
            }

            // buy
            {
                let logs = await getLogs(
                    web3,
                    lastBn+1,
                    currBnStep,
                    buyTopics
                );

                for (let i = 0; i < logs.length; i++) {
                    let tokenSymbol = tokenSkipList.get(logs[i].address);
                    if (tokenSymbol == null) {
                        let datetime = blockTimeMap.get(logs[i].blockNumber);
                        if (datetime == null) {
                            datetime = await getBlockTimeFromBlockNumber(logs[i].blockNumber);
                            blockTimeMap[logs[i].blockNumber] = datetime;
                        }

                        let log = web3.eth.abi.decodeLog(transferEvent.inputs, logs[i].data, logs[i].topics.slice(1));
                        tokenSymbol = await getTokenSymbol(logs[i].address);
                        let msg = datetime + " " + log.to + " 买:" + tokenSymbol + " (" + logs[i].address + ") " + web3.utils.fromWei(log.value) + "个";
                        msgs.push(msg);
                        console.log(msg);
                        await writeOneEvent(dataFile, log);
                    }
                }
            }

            if (msgs.length > 0) {
                await postMsg(msgs);
            }
        } catch (error) {
            console.error("listenLog", error.toString());
            console.log("error = " + lastBn + " " + currBnStep);

            await blockTimer(1000);
            continue;
        }

        lastBn = currBnStep;
        fs.writeFileSync("new_block.txt", currBnStep.toString());
        await blockTimer(1000);
        console.log("loop once end");
    }

};

main();

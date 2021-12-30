let cp = require("child_process");
let fs = require("fs");

console.log("------------------------------- WatchDog Start -------------------------------");

setInterval(() => {
    try {
        let dog = fs.readFileSync("dog.txt");
        let time = Number(dog.toString());

        if (time && Date.now() - time < 1000 * 60) {
            return;
        }

        console.log("准备重启, time", time);
        cp.exec("./restart.sh");
    } catch (error) {
        console.log(error);
    }
}, 30000);

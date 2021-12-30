process=$(ps -A | grep TraderTrackerDog)

if [ -n "$process" ]; then
    echo "watchDog已经在后台运行了！"
    exit
fi

nohup node --title=TraderTrackerDog WatchDog.js >> output_log.log 2>&1 &
echo "watchDog启动"

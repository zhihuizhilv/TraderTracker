process=$(ps -A | grep TraderTracker)

if [ -n "$process" ]; then
    echo "程序已经在后台运行了！"
    exit
fi

nohup node --title=TraderTracker tracker.js >> output.log 2>&1 &
echo "程序启动"

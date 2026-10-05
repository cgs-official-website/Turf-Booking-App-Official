Write-Host "Starting persistent ADB reverse watchdog..."
while ($true) {
    try {
        & adb reverse tcp:5000 tcp:5000 2>$null
        & adb reverse tcp:8081 tcp:8081 2>$null
    } catch {
        # ignore transient USB/ADB disconnects
    }
    Start-Sleep -Seconds 8
}

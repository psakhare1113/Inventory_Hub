@echo off
echo Starting Prometheus for Inventory Hub...
copy /Y "%~dp0prometheus-windows.yml" "C:\prometheus\prometheus-3.11.3.windows-amd64\prometheus-windows.yml"
cd C:\prometheus\prometheus-3.11.3.windows-amd64
prometheus.exe --config.file=prometheus-windows.yml
pause

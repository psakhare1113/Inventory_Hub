@echo off
REM ============================================================
REM  Start ELK Stack for Inventory Hub
REM  Elasticsearch + Logstash + Kibana + Filebeat
REM ============================================================

echo.
echo  ====================================================
echo   Inventory Hub - ELK Stack Startup
echo  ====================================================
echo.

REM Create logs directory structure
echo [1/4] Creating logs directories...
if not exist "..\logs\api-gateway"       mkdir "..\logs\api-gateway"
if not exist "..\logs\warehouse-service" mkdir "..\logs\warehouse-service"
if not exist "..\logs\orders-service"    mkdir "..\logs\orders-service"
if not exist "..\logs\products-service"  mkdir "..\logs\products-service"
if not exist "..\logs\auth-server"       mkdir "..\logs\auth-server"
if not exist "..\logs\inventory-service" mkdir "..\logs\inventory-service"
if not exist "..\logs\payment-service"   mkdir "..\logs\payment-service"
if not exist "..\logs\shipping-service"  mkdir "..\logs\shipping-service"
echo    Done.

echo.
echo [2/4] Starting ELK Stack with Docker Compose...
docker-compose -f docker-compose-elk.yml up -d

echo.
echo [3/4] Waiting for services to start (60 seconds)...
timeout /t 60 /nobreak

echo.
echo [4/4] Checking service status...
docker-compose -f docker-compose-elk.yml ps

echo.
echo  ====================================================
echo   ELK Stack is running!
echo  ====================================================
echo.
echo   Kibana Dashboard  : http://localhost:5601
echo   Elasticsearch     : http://localhost:9200
echo   Logstash API      : http://localhost:9600
echo.
echo   Index Pattern to create in Kibana:
echo     inventory-hub-*
echo.
echo   Test log simulation (after starting warehouse-service):
echo     POST http://localhost:8088/api/warehouse/logs/simulate/all
echo.
echo  ====================================================
pause

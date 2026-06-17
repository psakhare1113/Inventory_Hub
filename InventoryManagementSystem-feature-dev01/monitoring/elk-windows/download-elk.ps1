# ELK Stack Windows Setup Script
# Run: powershell -ExecutionPolicy Bypass -File download-elk.ps1

$ELK_VERSION = "8.12.0"
$INSTALL_DIR = "D:\elk-stack"
$BASE_URL = "https://artifacts.elastic.co/downloads"
$LOG_BASE = "D:\Inventory-Hub\InventoryManagementSystem-feature-dev01\logs"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Inventory Hub - ELK Stack Windows Setup  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ── Directories ───────────────────────────────────────────
New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
New-Item -ItemType Directory -Path "D:\elk-stack\logs\elasticsearch" -Force | Out-Null

$services = @("api-gateway","warehouse-service","orders-service","products-service","auth-server","inventory-service","payment-service","shipping-service")
foreach ($svc in $services) {
    New-Item -ItemType Directory -Path "$LOG_BASE\$svc" -Force | Out-Null
}
Write-Host "[OK] Directories created" -ForegroundColor Green

# ── Download helper ───────────────────────────────────────
function Download-File($url, $dest, $name) {
    if (Test-Path $dest) {
        Write-Host "[SKIP] $name already downloaded" -ForegroundColor Yellow
        return
    }
    Write-Host "[DOWNLOADING] $name - please wait..." -ForegroundColor Cyan
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    Write-Host "[OK] $name downloaded" -ForegroundColor Green
}

function Extract-Zip($zipFile, $checkDir, $name) {
    if (Test-Path $checkDir) {
        Write-Host "[SKIP] $name already extracted" -ForegroundColor Yellow
        return
    }
    Write-Host "[EXTRACTING] $name ..." -ForegroundColor Cyan
    Expand-Archive -Path $zipFile -DestinationPath $INSTALL_DIR -Force
    Write-Host "[OK] $name extracted" -ForegroundColor Green
}

# ── 1. Elasticsearch ──────────────────────────────────────
Write-Host ""
Write-Host "--- Step 1/3: Elasticsearch ---" -ForegroundColor Magenta
$esZip = "$INSTALL_DIR\elasticsearch-$ELK_VERSION.zip"
$esDir = "$INSTALL_DIR\elasticsearch-$ELK_VERSION"
$esUrl = "$BASE_URL/elasticsearch/elasticsearch-$ELK_VERSION-windows-x86_64.zip"
Download-File $esUrl $esZip "Elasticsearch"
Extract-Zip $esZip $esDir "Elasticsearch"

# Configure Elasticsearch
$esConfigLines = @(
    "cluster.name: inventory-hub-cluster",
    "node.name: inventory-node-1",
    "network.host: 0.0.0.0",
    "http.port: 9200",
    "discovery.type: single-node",
    "xpack.security.enabled: false",
    "xpack.security.http.ssl.enabled: false",
    "xpack.security.transport.ssl.enabled: false",
    "path.logs: D:/elk-stack/logs/elasticsearch"
)
Set-Content -Path "$esDir\config\elasticsearch.yml" -Value $esConfigLines -Encoding UTF8

New-Item -ItemType Directory -Path "$esDir\config\jvm.options.d" -Force | Out-Null
Set-Content -Path "$esDir\config\jvm.options.d\heap.options" -Value @("-Xms512m", "-Xmx1g") -Encoding UTF8
Write-Host "[OK] Elasticsearch configured" -ForegroundColor Green

# ── 2. Logstash ───────────────────────────────────────────
Write-Host ""
Write-Host "--- Step 2/3: Logstash ---" -ForegroundColor Magenta
$lsZip = "$INSTALL_DIR\logstash-$ELK_VERSION.zip"
$lsDir = "$INSTALL_DIR\logstash-$ELK_VERSION"
$lsUrl = "$BASE_URL/logstash/logstash-$ELK_VERSION-windows-x86_64.zip"
Download-File $lsUrl $lsZip "Logstash"
Extract-Zip $lsZip $lsDir "Logstash"

# Logstash pipeline config (written as plain text, not heredoc)
$pipelineDir = "$lsDir\config\pipeline"
New-Item -ItemType Directory -Path $pipelineDir -Force | Out-Null

$pipelineLines = @(
    "input {",
    "  file {",
    "    path => `"D:/Inventory-Hub/InventoryManagementSystem-feature-dev01/logs/**/*.log`"",
    "    start_position => `"beginning`"",
    "    sincedb_path => `"D:/elk-stack/logstash-sincedb`"",
    "    codec => `"json`"",
    "  }",
    "}",
    "",
    "filter {",
    "  if [message] {",
    "    mutate {",
    "      rename => {",
    "        `"level`"     => `"log_level`"",
    "        `"service`"   => `"service_name`"",
    "        `"message`"   => `"log_message`"",
    "        `"scenario`"  => `"scenario`"",
    "        `"latencyMs`" => `"latency_ms`"",
    "        `"errorType`" => `"error_type`"",
    "      }",
    "    }",
    "  }",
    "  if [path] and ![service_name] {",
    "    grok {",
    "      match => { `"path`" => `"D:/Inventory-Hub/InventoryManagementSystem-feature-dev01/logs/%{DATA:service_name}/`" }",
    "    }",
    "  }",
    "  if [latency_ms] {",
    "    mutate { convert => { `"latency_ms`" => `"integer`" } }",
    "  }",
    "}",
    "",
    "output {",
    "  elasticsearch {",
    "    hosts => [`"http://localhost:9200`"]",
    "    index => `"inventory-hub-%{[service_name]}-%{+YYYY.MM.dd}`"",
    "  }",
    "}"
)
Set-Content -Path "$pipelineDir\inventory-hub.conf" -Value $pipelineLines -Encoding UTF8

# Logstash settings
$lsSettingsLines = @(
    "http.host: '0.0.0.0'",
    "path.config: D:/elk-stack/logstash-$ELK_VERSION/config/pipeline"
)
Set-Content -Path "$lsDir\config\logstash.yml" -Value $lsSettingsLines -Encoding UTF8

# Reduce JVM heap
$jvmPath = "$lsDir\config\jvm.options"
if (Test-Path $jvmPath) {
    $jvmContent = Get-Content $jvmPath -Raw
    $jvmContent = $jvmContent -replace '-Xms\d+[mg]', '-Xms256m'
    $jvmContent = $jvmContent -replace '-Xmx\d+[mg]', '-Xmx512m'
    Set-Content -Path $jvmPath -Value $jvmContent -Encoding UTF8
}
Write-Host "[OK] Logstash configured" -ForegroundColor Green

# ── 3. Kibana ─────────────────────────────────────────────
Write-Host ""
Write-Host "--- Step 3/3: Kibana ---" -ForegroundColor Magenta
$kbZip = "$INSTALL_DIR\kibana-$ELK_VERSION.zip"
$kbDir = "$INSTALL_DIR\kibana-$ELK_VERSION"
$kbUrl = "$BASE_URL/kibana/kibana-$ELK_VERSION-windows-x86_64.zip"
Download-File $kbUrl $kbZip "Kibana"
Extract-Zip $kbZip $kbDir "Kibana"

$kbConfigLines = @(
    "server.port: 5601",
    "server.host: `"0.0.0.0`"",
    "server.name: `"inventory-hub-kibana`"",
    "elasticsearch.hosts: [`"http://localhost:9200`"]"
)
Set-Content -Path "$kbDir\config\kibana.yml" -Value $kbConfigLines -Encoding UTF8
Write-Host "[OK] Kibana configured" -ForegroundColor Green

# ── 4. Create start-all-elk.bat ───────────────────────────
Write-Host ""
Write-Host "--- Creating startup script ---" -ForegroundColor Magenta

$startBatLines = @(
    "@echo off",
    "echo Starting ELK Stack (No Docker)...",
    "echo.",
    "echo [1/3] Starting Elasticsearch...",
    "start `"Elasticsearch`" cmd /k `"D:\elk-stack\elasticsearch-$ELK_VERSION\bin\elasticsearch.bat`"",
    "echo Waiting 30 seconds for Elasticsearch to start...",
    "timeout /t 30 /nobreak",
    "echo.",
    "echo [2/3] Starting Logstash...",
    "start `"Logstash`" cmd /k `"D:\elk-stack\logstash-$ELK_VERSION\bin\logstash.bat -f D:\elk-stack\logstash-$ELK_VERSION\config\pipeline\inventory-hub.conf`"",
    "echo Waiting 20 seconds for Logstash to start...",
    "timeout /t 20 /nobreak",
    "echo.",
    "echo [3/3] Starting Kibana...",
    "start `"Kibana`" cmd /k `"D:\elk-stack\kibana-$ELK_VERSION\bin\kibana.bat`"",
    "echo.",
    "echo ============================================",
    "echo  ELK Stack Started - 3 windows opened",
    "echo ============================================",
    "echo  Elasticsearch : http://localhost:9200",
    "echo  Kibana        : http://localhost:5601",
    "echo  Logstash API  : http://localhost:9600",
    "echo ============================================",
    "echo  DO NOT close the 3 terminal windows!",
    "echo ============================================",
    "pause"
)
Set-Content -Path "$INSTALL_DIR\start-all-elk.bat" -Value $startBatLines -Encoding ASCII
Write-Host "[OK] start-all-elk.bat created" -ForegroundColor Green

# ── DONE ──────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ELK start करा:" -ForegroundColor Yellow
Write-Host "  D:\elk-stack\start-all-elk.bat" -ForegroundColor White
Write-Host ""
Write-Host "  Kibana: http://localhost:5601" -ForegroundColor Cyan
Write-Host ""

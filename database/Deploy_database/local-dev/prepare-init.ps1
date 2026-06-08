# ============================================================
# prepare-init.ps1
# 1. (Re)generate mock_data.sql  →  run gen_mock.py
# 2. Copy it into init/ as 02_mock_data.sql
# 3. Optionally run docker compose up -d
# ============================================================

$SCRIPT_DIR   = $PSScriptRoot
$MOCK_DIR     = Join-Path $SCRIPT_DIR "..\..\mock_data"
$GEN_SCRIPT   = Join-Path $MOCK_DIR "gen_mock.py"
$MOCK_SRC     = Join-Path $MOCK_DIR "mock_data.sql"
$MOCK_DST     = Join-Path $SCRIPT_DIR "init\02_mock_data.sql"

function Log($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Cyan }
function Ok($msg)  { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Green }
function Err($msg) { Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERROR: $msg" -ForegroundColor Red; exit 1 }

# ── Step 1: Generate mock data ────────────────────────────────────────────────
Log "Generating mock data..."
Push-Location $MOCK_DIR
python gen_mock.py
if ($LASTEXITCODE -ne 0) { Err "gen_mock.py failed." }
Pop-Location
Ok "mock_data.sql generated."

# ── Step 2: Verify outputs (gen_mock.py copies to init/ automatically) ───────
if (-not (Test-Path $MOCK_SRC)) { Err "Source not found: $MOCK_SRC" }
$SCHEMA_DST = Join-Path $SCRIPT_DIR "init\01_schema.sql"
if (-not (Test-Path $SCHEMA_DST)) { Err "Schema not found: $SCHEMA_DST (gen_mock.py should write this)" }
if (-not (Test-Path $MOCK_DST)) { Err "Mock data not found: $MOCK_DST" }
Ok "Schema + mock data ready in init/"

# ── Step 3: Ask to start stack ────────────────────────────────────────────────
$answer = Read-Host "Start docker compose now? [Y/n]"
if ($answer -eq "" -or $answer -match "^[Yy]") {
    Log "Running docker compose up -d ..."
    docker compose -f "$SCRIPT_DIR\docker-compose.yaml" up -d
    if ($LASTEXITCODE -ne 0) { Err "docker compose up failed." }
    Ok "Stack started. Check logs: docker compose logs -f starrocks-data-loader"
} else {
    Ok "Skipped. Run manually: docker compose up -d"
}

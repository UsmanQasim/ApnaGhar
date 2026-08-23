<#
  Applies the Ghar schema to the remote Neon database and seeds it.

      powershell -ExecutionPolicy Bypass -File scripts\deploy-db.ps1

  Reads DATABASE_URL and DIRECT_URL from apps\api\.env.neon (or uses whatever
  is already set in the shell). Nothing here is destructive: `migrate deploy`
  only applies migrations the database has not seen, and the seed upserts.

  Two URLs, because schema.prisma now declares both:
    DATABASE_URL - Neon's POOLED host (contains "-pooler"). What the deployed
                   serverless functions use.
    DIRECT_URL   - Neon's DIRECT host. What migrations use; PgBouncer cannot
                   run the DDL transactions they need.

  Safe to re-run.
#>

param(
    [switch]$SkipSeed
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

# ── Resolve the connection string ───────────────────────────────────────────
$envFile = Join-Path $repo 'apps\api\.env.neon'

function Read-EnvValue([string]$file, [string]$name) {
    if (-not (Test-Path $file)) { return $null }
    $line = Select-String -Path $file -Pattern "^\s*$name\s*=" | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line.Line -split '=', 2)[1].Trim().Trim('"').Trim("'")
}

if (-not $env:DATABASE_URL) { $env:DATABASE_URL = Read-EnvValue $envFile 'DATABASE_URL' }
if (-not $env:DIRECT_URL)   { $env:DIRECT_URL   = Read-EnvValue $envFile 'DIRECT_URL' }

if (-not $env:DATABASE_URL) {
    throw "No DATABASE_URL. Create apps\api\.env.neon or set `$env:DATABASE_URL first."
}

# schema.prisma declares directUrl, and `prisma generate` refuses to run if the
# variable is unset even though only migrations read it. Falling back to the
# pooled URL keeps a single-URL setup working.
if (-not $env:DIRECT_URL) {
    Write-Host 'DIRECT_URL not set - falling back to DATABASE_URL.' -ForegroundColor DarkYellow
    $env:DIRECT_URL = $env:DATABASE_URL
}

if ($env:DATABASE_URL -notmatch '^postgres(ql)?://') {
    throw "DATABASE_URL does not look like a Postgres connection string."
}

# Migrations must not go through PgBouncer.
if ($env:DIRECT_URL -match '-pooler') {
    Write-Host 'WARNING: DIRECT_URL points at the pooled host. Migrations may fail.' -ForegroundColor Yellow
    Write-Host '         Use the connection string WITHOUT "-pooler" for DIRECT_URL.' -ForegroundColor Yellow
}

# Show the host only — never echo the password into a terminal that might be
# screen-shared or pasted somewhere.
$dbHost = ([regex]::Match($env:DATABASE_URL, '@([^/:]+)')).Groups[1].Value
Write-Host "Target: $dbHost" -ForegroundColor Cyan
Write-Host ''

# NODE_ENV must NOT be 'production' here: prisma/seed.ts guards the demo agent
# behind `process.env.NODE_ENV !== 'production'`, and you want that agent for
# testing the create-listing flow.
$env:NODE_ENV = 'development'

# ── 1. Prisma client ────────────────────────────────────────────────────────
Write-Host '[1/4] Generating Prisma client...' -ForegroundColor Yellow
& pnpm --filter '@ghar/api' exec prisma generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed ($LASTEXITCODE)" }

# ── 2. Workspace packages ───────────────────────────────────────────────────
# The seed imports @ghar/shared, which resolves to packages/shared/dist.
Write-Host ''
Write-Host '[2/4] Building workspace packages...' -ForegroundColor Yellow
& pnpm --filter '@ghar/api...' run build
if ($LASTEXITCODE -ne 0) { throw "build failed ($LASTEXITCODE)" }

# ── 3. Migrations ───────────────────────────────────────────────────────────
Write-Host ''
Write-Host '[3/4] Applying migrations to Neon...' -ForegroundColor Yellow
& pnpm --filter '@ghar/api' exec prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'migrate deploy failed. Most likely causes:' -ForegroundColor Red
    Write-Host '  - 0000_init is missing  -> run scripts\create-baseline-migration.ps1'
    Write-Host '  - wrong / expired Neon password'
    Write-Host '  - your network blocks outbound port 5432'
    throw "prisma migrate deploy failed ($LASTEXITCODE)"
}

# ── 4. Seed ─────────────────────────────────────────────────────────────────
if ($SkipSeed) {
    Write-Host ''
    Write-Host '[4/4] Skipping seed (-SkipSeed).' -ForegroundColor DarkGray
}
else {
    Write-Host ''
    Write-Host '[4/4] Seeding plans, localities and the demo agent...' -ForegroundColor Yellow
    & pnpm --filter '@ghar/api' run seed
    if ($LASTEXITCODE -ne 0) { throw "seed failed ($LASTEXITCODE)" }
}

Write-Host ''
Write-Host 'Database is ready.' -ForegroundColor Green
& pnpm --filter '@ghar/api' exec prisma migrate status

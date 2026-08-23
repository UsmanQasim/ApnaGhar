<#
  Creates the baseline Prisma migration for ApnaGhar.

  Why this exists: apps/api/prisma/migrations contains only
  0001_postgis_and_search, which adds indexes and extensions but never creates
  the tables — it was written to run AFTER `prisma migrate dev` had already
  pushed the schema. On a fresh database `prisma migrate deploy` therefore
  fails with `relation "properties" does not exist`.

  This generates 0000_init/migration.sql from schema.prisma. "0000_" sorts
  before "0001_", so Prisma creates the tables first and the PostGIS indexes
  second — the order 0001 assumes.

  Run from anywhere:
      powershell -ExecutionPolicy Bypass -File scripts\create-baseline-migration.ps1

  Safe to re-run; it overwrites its own output and touches nothing else.
#>

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
Write-Host "Repo root: $repo"

$migrations = Join-Path $repo 'apps\api\prisma\migrations'
$initDir    = Join-Path $migrations '0000_init'
New-Item -ItemType Directory -Force -Path $initDir | Out-Null

Write-Host 'Running prisma migrate diff...'
# --filter runs this inside apps/api, so prisma/schema.prisma is relative to there.
$lines = & pnpm --filter '@ghar/api' exec prisma migrate diff `
    --from-empty `
    --to-schema-datamodel prisma/schema.prisma `
    --script

if ($LASTEXITCODE -ne 0) {
    throw "prisma migrate diff exited with $LASTEXITCODE - nothing was written."
}

$sql = ($lines -join "`n").Trim()

# Guard rail: a silent failure here would write an empty migration, which
# Prisma happily marks as applied - and then the tables never get created and
# the error surfaces days later as a crash-looping API.
if ($sql -notmatch 'CREATE TABLE') {
    throw "Generated SQL contains no CREATE TABLE statements. Aborting so an empty migration is not committed."
}

# Plain UTF-8, no BOM. PowerShell's `>` operator writes UTF-16 on 5.1, which
# Prisma cannot parse - hence writing the bytes explicitly.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $initDir 'migration.sql'), $sql + "`n", $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $migrations 'migration_lock.toml'), "provider = `"postgresql`"`n", $utf8NoBom)

$tables = ([regex]::Matches($sql, 'CREATE TABLE')).Count
$enums  = ([regex]::Matches($sql, 'CREATE TYPE')).Count

Write-Host ''
Write-Host "Wrote apps\api\prisma\migrations\0000_init\migration.sql" -ForegroundColor Green
Write-Host "  $tables tables, $enums enums, $($sql.Split("`n").Count) lines"
Write-Host "Wrote apps\api\prisma\migrations\migration_lock.toml" -ForegroundColor Green
Write-Host ''
Write-Host 'Next: set DATABASE_URL to your Neon string, then run'
Write-Host '  pnpm --filter @ghar/api exec prisma migrate deploy'

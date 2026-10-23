$dbPath = Join-Path -Path $PSScriptRoot -ChildPath 'dashboard.db'

if (Test-Path $dbPath) {
  Remove-Item $dbPath -Force
  Write-Host "Database deleted: $dbPath"
} else {
  Write-Host "Database file not found: $dbPath"
}

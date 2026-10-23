$rootDir = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path -Path $rootDir -ChildPath 'data\create-db.js'

npx tsx $scriptPath


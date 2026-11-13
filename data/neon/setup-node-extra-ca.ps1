param(
  [string]$OutputDir = "$HOME\.config\certs",
  [string]$OutputFile = "netskope-root.pem",
  [switch]$Validate
)

$ErrorActionPreference = 'Stop'

function Get-CorporateCaCerts {
  $stores = @('Cert:\LocalMachine\Root', 'Cert:\CurrentUser\Root')
  $patterns = @('Netskope', 'goskope', 'Stellantis')
  $all = @()

  foreach ($store in $stores) {
    $candidates = Get-ChildItem -Path $store | Where-Object {
      $_.Subject -match ($patterns -join '|') -or $_.Issuer -match ($patterns -join '|')
    }

    if ($candidates.Count -gt 0) {
      $all += $candidates
    }
  }

  if ($all.Count -eq 0) {
    throw 'No corporate root certificate matching Netskope/Stellantis/goskope was found in Root stores.'
  }

  $unique = $all | Group-Object Thumbprint | ForEach-Object { $_.Group[0] }

  # Prefer self-signed Netskope root first, then Stellantis roots.
  $ordered = $unique | Sort-Object @{ Expression = {
      if ($_.Subject -match 'goskope|Netskope' -and $_.Issuer -eq $_.Subject) { return 0 }
      if ($_.Subject -match 'Stellantis Root CA') { return 1 }
      if ($_.Subject -match 'Stellantis') { return 2 }
      return 3
    }}, @{ Expression = 'NotAfter'; Descending = $true }

  return $ordered
}

function Export-CertsToPemBundle {
  param(
    [Parameter(Mandatory = $true)]
    [System.Security.Cryptography.X509Certificates.X509Certificate2[]]$Certs,
    [Parameter(Mandatory = $true)]
    [string]$PemPath
  )

  $chunks = @()
  foreach ($cert in $Certs) {
    $base64 = [System.Convert]::ToBase64String($cert.RawData)
    $lines = ($base64 -split '(.{1,64})' | Where-Object { $_ })
    $chunks += "-----BEGIN CERTIFICATE-----`n$($lines -join "`n")`n-----END CERTIFICATE-----"
  }

  Set-Content -Path $PemPath -Value (($chunks -join "`n") + "`n") -Encoding ascii
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$pemPath = Join-Path $OutputDir $OutputFile

$certs = Get-CorporateCaCerts
Export-CertsToPemBundle -Certs $certs -PemPath $pemPath

# Set for current process and persist for current user.
$env:NODE_EXTRA_CA_CERTS = $pemPath
[Environment]::SetEnvironmentVariable('NODE_EXTRA_CA_CERTS', $pemPath, 'User')

Write-Host "Configured NODE_EXTRA_CA_CERTS to: $pemPath"
Write-Host "Included certificates:"
$certs | Select-Object -First 5 Subject, Thumbprint | Format-Table -AutoSize

if ($Validate) {
  node -e "const https=require('https'); https.get('https://console.neon.tech/api/v2/projects',res=>{console.log('node_https_status',res.statusCode);res.resume();}).on('error',e=>{console.error('node_https_error',e.code,e.message);process.exit(1);});"
  neon projects list
}

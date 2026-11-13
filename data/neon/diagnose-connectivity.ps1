param(
  [switch]$SpringCheck
)

$ErrorActionPreference = 'Continue'

function Add-Check {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Detail
  )

  [PSCustomObject]@{
    Check = $Name
    Status = $Status
    Detail = $Detail
  }
}

function Get-EnvValueFromDotEnv {
  param(
    [string]$FilePath,
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $line = Get-Content $FilePath | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  return $line.Substring($Key.Length + 1).Trim()
}

function Parse-JdbcHost {
  param([string]$JdbcUrl)

  if (-not $JdbcUrl) {
    return $null
  }

  $m = [regex]::Match($JdbcUrl, '^jdbc:postgresql://([^/:?]+)(?::(\d+))?/([^?]+)')
  if (-not $m.Success) {
    return $null
  }

  $port = 443
  if ($m.Groups[2].Value) {
    $port = [int]$m.Groups[2].Value
  }

  [PSCustomObject]@{
    Host = $m.Groups[1].Value
    Port = $port
    Database = $m.Groups[3].Value
  }
}

$results = @()
$cwd = Get-Location
$dotenvPath = Join-Path $cwd '.env'

$jdbcUrl = Get-EnvValueFromDotEnv -FilePath $dotenvPath -Key 'SPRING_DATASOURCE_URL'
$jdbcParts = Parse-JdbcHost -JdbcUrl $jdbcUrl

if (-not $jdbcParts) {
  $results += Add-Check -Name 'Env: JDBC URL parse' -Status 'FAIL' -Detail 'Could not parse SPRING_DATASOURCE_URL from .env'
  $results | Format-Table -AutoSize
  exit 1
}

if (-not $env:NODE_EXTRA_CA_CERTS) {
  $userCa = [Environment]::GetEnvironmentVariable('NODE_EXTRA_CA_CERTS', 'User')
  if ($userCa) {
    $env:NODE_EXTRA_CA_CERTS = $userCa
  }
}

$results += Add-Check -Name 'Target Host' -Status 'INFO' -Detail ("{0}:{1} db={2}" -f $jdbcParts.Host, $jdbcParts.Port, $jdbcParts.Database)
$results += Add-Check -Name 'NODE_EXTRA_CA_CERTS' -Status ($(if ($env:NODE_EXTRA_CA_CERTS) { 'INFO' } else { 'WARN' })) -Detail ($(if ($env:NODE_EXTRA_CA_CERTS) { $env:NODE_EXTRA_CA_CERTS } else { 'Not set in process or user env' }))

try {
  $vpnAdapters = Get-NetAdapter | Where-Object {
    $_.Status -eq 'Up' -and (
      $_.InterfaceDescription -match 'VPN|AnyConnect|GlobalProtect|Juniper|WireGuard|Fortinet|Pulse|Zscaler' -or
      $_.Name -match 'VPN|AnyConnect|GlobalProtect|Juniper|WireGuard|Fortinet|Pulse|Zscaler'
    )
  }
  if ($vpnAdapters) {
    $names = ($vpnAdapters | Select-Object -ExpandProperty Name) -join ', '
    $results += Add-Check -Name 'VPN Adapter Status' -Status 'INFO' -Detail ("Connected: {0}" -f $names)
  } else {
    $results += Add-Check -Name 'VPN Adapter Status' -Status 'INFO' -Detail 'No active VPN adapter detected'
  }
} catch {
  $results += Add-Check -Name 'VPN Adapter Status' -Status 'WARN' -Detail $_.Exception.Message
}

try {
  $dns = Resolve-DnsName -Name $jdbcParts.Host -Type A -ErrorAction Stop
  $ips = ($dns | Where-Object { $_.IPAddress } | Select-Object -ExpandProperty IPAddress) -join ', '
  $results += Add-Check -Name 'DNS Resolve' -Status 'PASS' -Detail $ips
} catch {
  $results += Add-Check -Name 'DNS Resolve' -Status 'FAIL' -Detail $_.Exception.Message
}

try {
  $tnc = Test-NetConnection -ComputerName $jdbcParts.Host -Port $jdbcParts.Port -InformationLevel Detailed
  if ($tnc.TcpTestSucceeded) {
    $results += Add-Check -Name 'TCP Reachability' -Status 'PASS' -Detail ("RemoteAddress={0}" -f $tnc.RemoteAddress)
  } else {
    $results += Add-Check -Name 'TCP Reachability' -Status 'FAIL' -Detail 'TcpTestSucceeded=False'
  }
} catch {
  $results += Add-Check -Name 'TCP Reachability' -Status 'FAIL' -Detail $_.Exception.Message
}

try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $tcp.Connect($jdbcParts.Host, $jdbcParts.Port)
  $ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false, ({ $true }))
  $ssl.AuthenticateAsClient($jdbcParts.Host)
  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $ssl.RemoteCertificate
  $results += Add-Check -Name 'TLS Handshake' -Status 'PASS' -Detail ("Protocol={0}; Issuer={1}" -f $ssl.SslProtocol, $cert.Issuer)
  $ssl.Close()
  $tcp.Close()
} catch {
  $results += Add-Check -Name 'TLS Handshake' -Status 'FAIL' -Detail $_.Exception.Message
}

try {
  $client = New-Object System.Net.Sockets.TcpClient
  $client.ReceiveTimeout = 5000
  $client.SendTimeout = 5000
  $client.Connect($jdbcParts.Host, $jdbcParts.Port)
  $stream = $client.GetStream()

  [byte[]]$sslRequest = 0,0,0,8,4,210,22,47
  $stream.Write($sslRequest, 0, $sslRequest.Length)
  $stream.Flush()

  [byte[]]$resp = New-Object byte[] 1
  $read = $stream.Read($resp, 0, 1)

  if ($read -eq 1) {
    $char = [char]$resp[0]
    if ($char -eq 'S') {
      $results += Add-Check -Name 'PG SSLRequest' -Status 'PASS' -Detail 'Server replied S (accept SSL)'
    } elseif ($char -eq 'N') {
      $results += Add-Check -Name 'PG SSLRequest' -Status 'WARN' -Detail 'Server replied N (reject SSL)'
    } else {
      $results += Add-Check -Name 'PG SSLRequest' -Status 'WARN' -Detail ("Unexpected response byte: {0}" -f [int]$resp[0])
    }
  } else {
    $results += Add-Check -Name 'PG SSLRequest' -Status 'FAIL' -Detail 'No response to SSLRequest'
  }

  $stream.Close()
  $client.Close()
} catch {
  $results += Add-Check -Name 'PG SSLRequest' -Status 'FAIL' -Detail $_.Exception.Message
}

try {
  $nodeOut = node -e "const https=require('https');https.get('https://console.neon.tech/api/v2/projects',r=>{console.log('status='+r.statusCode);r.resume();}).on('error',e=>{console.error(e.code+':'+e.message);process.exit(1);});" 2>&1
  if ($LASTEXITCODE -eq 0) {
    $results += Add-Check -Name 'Node HTTPS Neon API' -Status 'PASS' -Detail (($nodeOut | Out-String).Trim())
  } else {
    $results += Add-Check -Name 'Node HTTPS Neon API' -Status 'FAIL' -Detail (($nodeOut | Out-String).Trim())
  }
} catch {
  $results += Add-Check -Name 'Node HTTPS Neon API' -Status 'FAIL' -Detail $_.Exception.Message
}

try {
  $meOut = neon me 2>&1
  if ($LASTEXITCODE -eq 0) {
    $results += Add-Check -Name 'Neon CLI Auth' -Status 'PASS' -Detail (($meOut | Out-String).Trim())
  } else {
    $results += Add-Check -Name 'Neon CLI Auth' -Status 'FAIL' -Detail (($meOut | Out-String).Trim())
  }
} catch {
  $results += Add-Check -Name 'Neon CLI Auth' -Status 'FAIL' -Detail $_.Exception.Message
}

try {
  $csOut = neon connection-string 2>&1
  if ($LASTEXITCODE -eq 0) {
    $results += Add-Check -Name 'Neon Connection String' -Status 'PASS' -Detail (($csOut | Out-String).Trim())
  } else {
    $results += Add-Check -Name 'Neon Connection String' -Status 'FAIL' -Detail (($csOut | Out-String).Trim())
  }
} catch {
  $results += Add-Check -Name 'Neon Connection String' -Status 'FAIL' -Detail $_.Exception.Message
}

if ($SpringCheck) {
  try {
    $cmd = 'mvn -f backend/pom.xml -DskipTests spring-boot:run "-Dspring-boot.run.profiles=postgres" "-Dspring-boot.run.arguments=--server.port=8099"'
    $springOut = Invoke-Expression $cmd 2>&1
    $full = ($springOut | Out-String)

    if ($full -match 'Started\s+MockDashboardBackendApplication') {
      $results += Add-Check -Name 'Spring Postgres Startup' -Status 'PASS' -Detail 'Backend started successfully with postgres profile'
    } elseif ($full -match 'SQL State\s*: 08001' -or $full -match 'Connection reset') {
      $results += Add-Check -Name 'Spring Postgres Startup' -Status 'FAIL' -Detail 'SQLState 08001 / Connection reset during DB connection'
    } else {
      $results += Add-Check -Name 'Spring Postgres Startup' -Status 'WARN' -Detail 'Could not confidently classify startup result; review Maven output'
    }
  } catch {
    $results += Add-Check -Name 'Spring Postgres Startup' -Status 'FAIL' -Detail $_.Exception.Message
  }
}

Write-Host ''
Write-Host ('Neon/Postgres Connectivity Diagnostics @ ' + (Get-Date).ToString('s'))
$results | Format-Table -AutoSize

$criticalFailed = $results | Where-Object {
  $_.Check -in @('DNS Resolve', 'TCP Reachability', 'PG SSLRequest', 'Node HTTPS Neon API', 'Neon CLI Auth', 'Neon Connection String') -and $_.Status -eq 'FAIL'
}

if ($criticalFailed.Count -gt 0) {
  exit 2
}

exit 0

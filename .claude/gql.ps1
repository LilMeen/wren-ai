param(
  [string]$Email = "dev@email.com",
  [string]$Password = "88888888",
  [int]$ProjectId = 0,
  [string]$Query,
  [string]$VariablesJson = "{}",
  [string]$OperationName = ""
)

$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3000"

# sign in
$signinBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$null = Invoke-WebRequest -Uri "$base/api/auth/signin" -Method POST -ContentType "application/json" -Body $signinBody -SessionVariable ws -UseBasicParsing

# select project if requested
if ($ProjectId -gt 0) {
  $selBody = @{ projectId = $ProjectId } | ConvertTo-Json -Compress
  $null = Invoke-WebRequest -Uri "$base/api/projects/select" -Method POST -ContentType "application/json" -Body $selBody -WebSession $ws -UseBasicParsing
}

# graphql call
$payload = @{ query = $Query; variables = (ConvertFrom-Json $VariablesJson) }
if ($OperationName) { $payload.operationName = $OperationName }
$json = $payload | ConvertTo-Json -Compress -Depth 10

try {
  $resp = Invoke-WebRequest -Uri "$base/api/graphql" -Method POST -ContentType "application/json" -Body $json -WebSession $ws -UseBasicParsing -TimeoutSec 180
  Write-Output "HTTP $($resp.StatusCode)"
  Write-Output $resp.Content
} catch {
  $code = $null
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  Write-Output "HTTP_ERROR $code"
  if ($_.ErrorDetails) { Write-Output $_.ErrorDetails.Message }
  else { Write-Output $_.Exception.Message }
}

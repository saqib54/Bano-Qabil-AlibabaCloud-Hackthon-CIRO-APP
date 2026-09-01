$conns = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if (-not $conns) {
  Write-Output 'no listener on 5000'
  exit 0
}
$conns.OwningProcess | Sort-Object -Unique | ForEach-Object {
  Write-Output ("killing PID " + $_)
  taskkill /PID $_ /F
}

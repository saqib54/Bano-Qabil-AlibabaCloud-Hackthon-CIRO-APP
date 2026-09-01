$conn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Write-Output 'killed 5173'
} else {
  Write-Output '5173 free'
}

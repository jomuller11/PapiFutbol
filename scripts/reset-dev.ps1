$projectRoot = Split-Path -Parent $PSScriptRoot

$nextProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -and
    $_.CommandLine.Contains($projectRoot) -and
    $_.CommandLine.Contains('next')
  }

foreach ($proc in $nextProcesses) {
  Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
}

$nextDir = Join-Path $projectRoot '.next'
if (Test-Path $nextDir) {
  Remove-Item -LiteralPath $nextDir -Recurse -Force
}

$stdout = Join-Path $projectRoot 'devserver-3000.log'
$stderr = Join-Path $projectRoot 'devserver-3000.err.log'

Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', 'npm run dev > devserver-3000.log 2> devserver-3000.err.log' `
  -WorkingDirectory $projectRoot

Write-Output 'Dev server reiniciado. Revisar http://localhost:3000'
Write-Output "Logs: $stdout"
Write-Output "Errores: $stderr"

param(
  [Parameter(Mandatory = $true)]
  [string]$Action
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runnerPath = Join-Path $scriptDir 'hook-runner.mjs'

function Resolve-NodePath {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    return $command.Source
  }

  $candidates = @(
    $env:NODE_BINARY,
    $(if ($env:ProgramFiles) { Join-Path $env:ProgramFiles 'nodejs\node.exe' }),
    $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe' }),
    $(if ($env:APPDATA) { Join-Path $env:APPDATA 'nvm\node.exe' }),
    $(if ($env:NVM_SYMLINK) { Join-Path $env:NVM_SYMLINK 'node.exe' }),
    $(if ($env:NVM_HOME) { Join-Path $env:NVM_HOME 'node.exe' }),
    $(if ($env:USERPROFILE) { Join-Path $env:USERPROFILE 'scoop\apps\nodejs\current\node.exe' }),
    $(if ($env:USERPROFILE) { Join-Path $env:USERPROFILE '.volta\bin\node.exe' })
  ) | Where-Object { $_ }

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate -PathType Leaf) {
      return $candidate
    }
  }

  throw 'Node.js executable was not found. Install Node.js or expose it on PATH for Copilot hooks.'
}

$nodePath = Resolve-NodePath
& $nodePath $runnerPath $Action
exit $LASTEXITCODE
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$InstallRoot = $(if (Test-Path -LiteralPath 'D:\') { 'D:\agent-skills' } else { Join-Path $env:USERPROFILE 'agent-skills' }),
    [switch]$InstallUv
)

$ErrorActionPreference = 'Stop'
$repoUrl = 'https://github.com/heruumhmd/my-agent-skills.git'

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw 'git.exe is required.' }

if (-not (Test-Path -LiteralPath $InstallRoot)) {
    if ($PSCmdlet.ShouldProcess($InstallRoot, 'Clone public agent skills repository')) {
        git clone $repoUrl $InstallRoot
        if ($LASTEXITCODE -ne 0) { throw "Clone failed with exit code $LASTEXITCODE" }
    }
} else {
    $remote = git -C $InstallRoot remote get-url mybackup 2>$null
    if ($remote -ne $repoUrl) { throw "Existing directory is not the expected repository: $InstallRoot" }
}

if ($InstallUv) {
    Write-Warning 'uv installation is intentionally not automated here; install it from the official uv documentation and verify the package manager before use.'
}

$setup = Join-Path $InstallRoot 'setup-windows-agent.ps1'
if (-not (Test-Path -LiteralPath $setup -PathType Leaf)) { throw "Bootstrap script missing: $setup" }
& powershell.exe -NoProfile -File $setup -InstallRoot $InstallRoot
if ($LASTEXITCODE -ne 0) { throw "Windows setup failed with exit code $LASTEXITCODE" }
Write-Output 'NEW COMPUTER SETUP COMPLETED: repository, links, registry configuration, and task registration verified by their own scripts.'

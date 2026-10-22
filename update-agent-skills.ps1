[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$ManifestPath = '',
    [string]$LogPath = ''
)

$ErrorActionPreference = 'Stop'
if (-not $ManifestPath) { $ManifestPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'automation\repos.json' }
if (-not $LogPath) {
    $localAppData = [Environment]::GetFolderPath('LocalApplicationData')
    $LogPath = Join-Path $localAppData 'HeruAgentSkills\sync.log'
}
$logParent = Split-Path -Parent $LogPath
if ($logParent -and -not (Test-Path -LiteralPath $logParent)) { New-Item -ItemType Directory -Force -Path $logParent | Out-Null }
$exitCode = 0
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ssK'

function Write-Result([string]$Name, [string]$Status, [string]$Message) {
    $line = "[$timestamp] [$Name] [$Status] $Message"
    Write-Output $line
    if ($LogPath) { Add-Content -LiteralPath $LogPath -Value $line }
}

if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
    Write-Result 'manifest' 'ERROR' "Manifest not found: $ManifestPath"
    exit 1
}

try { $repos = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json }
catch {
    Write-Result 'manifest' 'ERROR' $_.Exception.Message
    exit 1
}

foreach ($repo in @($repos.repositories)) {
    $name = [string]$repo.name
    $path = [string]$repo.path
    if (-not (Test-Path -LiteralPath $path -PathType Container)) {
        Write-Result $name 'SKIP' "Directory not found: $path"
        if ($exitCode -eq 0) { $exitCode = 2 }
        continue
    }

    try {
        $status = (& git -C $path status --porcelain=v1 2>&1)
        if ($LASTEXITCODE -ne 0) { throw "Cannot inspect repository: $status" }
        if ($status) {
            Write-Result $name 'SKIP' 'Working tree is dirty; no fetch or mutation performed.'
            if ($exitCode -eq 0) { $exitCode = 2 }
            continue
        }

        $remote = if ($repo.remote) { [string]$repo.remote } else { 'origin' }
        $branch = if ($repo.branch) { [string]$repo.branch } else { 'main' }
        $tracking = "$remote/$branch"
        & git -C $path fetch --quiet $remote $branch
        if ($LASTEXITCODE -ne 0) { throw "Fetch failed for $tracking" }

        $local = (& git -C $path rev-parse HEAD).Trim()
        $remoteCommit = (& git -C $path rev-parse $tracking).Trim()
        if ($LASTEXITCODE -ne 0) { throw "Tracking ref not found: $tracking" }
        if ($local -eq $remoteCommit) {
            Write-Result $name 'OK' "Already up to date ($local)."
            continue
        }

        & git -C $path merge-base --is-ancestor HEAD $tracking
        if ($LASTEXITCODE -ne 0) {
            Write-Result $name 'SKIP' "Non-fast-forward update requires review: HEAD=$local target=$remoteCommit"
            if ($exitCode -eq 0) { $exitCode = 2 }
            continue
        }
        if ($PSCmdlet.ShouldProcess($path, "Fast-forward to $tracking")) {
            & git -C $path merge --ff-only $tracking
            if ($LASTEXITCODE -ne 0) { throw "Fast-forward failed for $tracking" }
            Write-Result $name 'UPDATED' "Fast-forwarded to $remoteCommit."
        } else {
            Write-Result $name 'WHATIF' "Would fast-forward to $remoteCommit."
        }
    } catch {
        Write-Result $name 'ERROR' $_.Exception.Message
        # Operational failures have priority over advisory skips (exit 2).
        $exitCode = 1
    }
}


# Automatically sync to Antigravity global plugin directory
$geminiPluginTarget = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.gemini\config\plugins\heru-agent-skills'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path -LiteralPath $geminiPluginTarget -PathType Container) {
    $null = & robocopy $repoRoot $geminiPluginTarget /mir /xd .git /njh /njs /ndl /nc /ns
    Write-Result 'gemini-plugin' 'SYNC' "Synced to $geminiPluginTarget"
}

exit $exitCode


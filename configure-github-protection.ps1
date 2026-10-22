[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Repository = 'heruumhmd/my-agent-skills',
    [string]$Branch = 'main',
    [string]$PayloadOutputPath = ''
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command gh.exe -ErrorAction SilentlyContinue)) { throw 'GitHub CLI (gh.exe) is required.' }
if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw "Invalid GitHub repository: $Repository" }
if ($Branch -notmatch '^[A-Za-z0-9._/-]+$') { throw "Invalid branch: $Branch" }

$payload = [ordered]@{
    required_status_checks = [ordered]@{
        strict = $true
        contexts = @(
            'Validate Skills, Commands, Tests, and Routing',
            'Validate Windows automation'
        )
    }
    enforce_admins = $true
    required_pull_request_reviews = $null
    restrictions = $null
    required_linear_history = $false
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_conversation_resolution = $true
    lock_branch = $false
    allow_fork_syncing = $true
}

function Write-ProtectionPayload {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][object]$Value
    )

    $fullPath = [IO.Path]::GetFullPath($Path)
    $parent = Split-Path -Parent $fullPath
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
        throw "Payload output directory does not exist: $parent"
    }

    $json = $Value | ConvertTo-Json -Depth 10
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($fullPath, $json, $utf8NoBom)
    return $fullPath
}

$endpoint = "repos/$Repository/branches/$Branch/protection"
$payloadFile = $null
$ownsPayloadFile = $false
if ($PayloadOutputPath) {
    $payloadFile = Write-ProtectionPayload -Path $PayloadOutputPath -Value $payload
}

if (-not $PSCmdlet.ShouldProcess("https://github.com/$Repository/tree/$Branch", 'Enable branch protection')) {
    Write-Output "WHATIF: would PUT branch protection to $endpoint"
    exit 0
}

& gh.exe auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'GitHub CLI is not authenticated. Run `gh auth login` and retry.' }

if (-not $payloadFile) {
    $payloadFile = Join-Path ([IO.Path]::GetTempPath()) ("heru-branch-protection-" + [guid]::NewGuid().ToString('N') + '.json')
    $payloadFile = Write-ProtectionPayload -Path $payloadFile -Value $payload
    $ownsPayloadFile = $true
}

try {
    & gh.exe api --method PUT $endpoint --input $payloadFile
    if ($LASTEXITCODE -ne 0) { throw "GitHub branch-protection request failed with exit code $LASTEXITCODE" }
    Write-Output "BRANCH PROTECTION ENABLED: $Repository/$Branch"
} finally {
    if ($ownsPayloadFile -and (Test-Path -LiteralPath $payloadFile)) {
        Remove-Item -LiteralPath $payloadFile -Force
    }
}

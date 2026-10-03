param(
    [string]$Foremerge = "$env:USERPROFILE\.codex\bin\foremerge.exe"
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Foremerge -PathType Leaf)) {
    throw "Foremerge executable not found: $Foremerge"
}
$version = & $Foremerge --version
if ($LASTEXITCODE -ne 0 -or $version -ne 'foremerge 0.5.0') {
    throw "This detector check requires Foremerge 0.5.0; found: $version"
}

$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$repo = Join-Path $tempRoot ("cogfit-foremerge-check-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $repo | Out-Null

try {
    & git -C $repo init -q
    if ($LASTEXITCODE -ne 0) { throw 'Could not initialize disposable Git repository' }
    $database = Join-Path $repo 'check.sqlite3'

    & $Foremerge --cwd $repo --database $database init | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Foremerge initialization failed' }

    $firstAgent = (& $Foremerge --cwd $repo --database $database --json agent register --name replace-agent --no-worktree | ConvertFrom-Json).data.id
    $secondAgent = (& $Foremerge --cwd $repo --database $database --json agent register --name extend-agent --no-worktree | ConvertFrom-Json).data.id
    if (-not $firstAgent -or -not $secondAgent) { throw 'Agent registration failed' }

    & $Foremerge --cwd $repo --database $database --json intent publish --agent $firstAgent --task replace-contract --summary 'Replace profile evidence contract' --scope 'contract:profile.evidence=replace' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'First intent publication failed' }

    $result = & $Foremerge --cwd $repo --database $database --json intent publish --agent $secondAgent --task extend-contract --summary 'Extend profile evidence contract' --scope 'contract:profile.evidence=extend' | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Second intent publication failed' }
    $finding = $result.data.conflicts | Where-Object { $_.kind -eq 'destructive_vs_additive' -and $_.severity -eq 'HIGH' -and $_.evidence.detected_before_code }
    if (-not $finding) { throw 'Expected early high severity conflict was not reported' }

    Write-Output 'PASS: Foremerge reported the profile evidence contract conflict before code changes.'
}
finally {
    $resolvedRepo = [IO.Path]::GetFullPath($repo)
    if ((Test-Path -LiteralPath $resolvedRepo) -and
        $resolvedRepo.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedRepo) -like 'cogfit-foremerge-check-*') {
        Remove-Item -LiteralPath $resolvedRepo -Recurse -Force
    }
}

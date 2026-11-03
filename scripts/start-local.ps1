param(
    [ValidateRange(1024, 65535)][int]$ReaderPort = 5173,
    [switch]$NoBrowser,
    [switch]$NoNarration
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$narrationProcess = $null

function Test-LocalPort([int]$Number) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.BeginConnect('127.0.0.1', $Number, $null, $null)
        if (-not $connection.AsyncWaitHandle.WaitOne(250)) { return $false }
        $client.EndConnect($connection)
        return $true
    } catch { return $false }
    finally { $client.Dispose() }
}

Push-Location -LiteralPath $projectRoot
try {
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js/npm est introuvable. Installez Node.js puis relancez ce script.'
    }
    if (-not (Test-Path -LiteralPath 'node_modules/.bin/vite.cmd')) {
        throw 'Dependances absentes : lancez npm ci dans le dossier Listoire.'
    }
    if (Test-LocalPort $ReaderPort) {
        Write-Host "Le port $ReaderPort est deja utilise. Aucun processus existant ne sera arrete."
        if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$ReaderPort/" }
        return
    }

    $pythonPath = Join-Path $projectRoot '.fallow/tts-venv/Scripts/python.exe'
    if (-not $NoNarration -and (Test-Path -LiteralPath $pythonPath)) {
        & npm.cmd run narration:export
        if ($LASTEXITCODE -ne 0) { throw 'La preparation des textes a echoue.' }
        if (Test-LocalPort 8765) {
            Write-Host 'Le port de narration 8765 est deja occupe ; le processus existant est conserve.'
        } else {
            $narrationProcess = Start-Process -FilePath $pythonPath -ArgumentList @('-u', 'tools/narration.py', 'serve') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot '.fallow/local-narration.log') -RedirectStandardError (Join-Path $projectRoot '.fallow/local-narration.stderr.log')
            Write-Host 'Narration locale demarree. Les MP3 prepares restent disponibles en secours.'
        }
    }

    Write-Host "Listoire : http://127.0.0.1:$ReaderPort/"
    Write-Host 'Pour arreter le lecteur et son service de narration : Ctrl+C dans cette fenetre.'
    $viteArguments = @('run', 'dev', '--', '--port', "$ReaderPort", '--strictPort')
    if (-not $NoBrowser) { $viteArguments += '--open' }
    & npm.cmd @viteArguments
    if ($LASTEXITCODE -ne 0) { throw 'Le serveur local s''est termine avec une erreur.' }
} finally {
    if ($narrationProcess -and -not $narrationProcess.HasExited) {
        & taskkill.exe /PID $narrationProcess.Id /T /F | Out-Null
    }
    Pop-Location
}

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$taskSynthType = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]
$taskStreamType = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]
$taskReaderType = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime]
$taskAwaitMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
function Wait-SpeechOperation($operation, $resultType) {
    $taskOperation = $taskAwaitMethod.MakeGenericMethod($resultType).Invoke($null, @($operation))
    $taskOperation.Wait()
    return $taskOperation.Result
}
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOutput = Join-Path $taskRoot '.fallow/narrator-reference'
New-Item -ItemType Directory -Force -Path $taskOutput | Out-Null
$taskText = 'Beyond the window, the last light rested on the hills. A door stood open where no door had ever been. You took one quiet step, and the whole world seemed to listen.'
foreach ($taskName in @('Linda', 'Richard')) {
    if (Test-Path -LiteralPath (Join-Path $taskOutput "$($taskName.ToLower()).wav")) { continue }
    $taskVoice = $taskSynthType::AllVoices | Where-Object { $_.DisplayName -eq "Microsoft $taskName" } | Select-Object -First 1
    if (-not $taskVoice) { throw "The installed synthetic voice $taskName is unavailable." }
    $taskSynth = New-Object $taskSynthType
    $taskSynth.Voice = $taskVoice
    $taskStream = Wait-SpeechOperation ($taskSynth.SynthesizeTextToStreamAsync($taskText)) $taskStreamType
    $taskReader = New-Object $taskReaderType($taskStream)
    [void](Wait-SpeechOperation ($taskReader.LoadAsync([uint32]$taskStream.Size)) ([uint32]))
    $taskBytes = New-Object byte[] ([int]$taskStream.Size)
    $taskReader.ReadBytes($taskBytes)
    [System.IO.File]::WriteAllBytes((Join-Path $taskOutput "$($taskName.ToLower()).wav"), $taskBytes)
    $taskReader.Dispose()
    $taskSynth.Dispose()
    Write-Output "$taskName reference prepared ($($taskBytes.Length) bytes)."
}
$taskRegisters = @(
    @{ Key = 'linda'; Base = 'linda'; Pitch = 1.0 },
    @{ Key = 'richard'; Base = 'richard'; Pitch = 1.0 },
    @{ Key = 'linda-young'; Base = 'linda'; Pitch = 1.26 },
    @{ Key = 'richard-young'; Base = 'richard'; Pitch = 1.19 },
    @{ Key = 'linda-low'; Base = 'linda'; Pitch = 0.89 },
    @{ Key = 'richard-deep'; Base = 'richard'; Pitch = 0.79 }
)
foreach ($taskRegister in $taskRegisters) {
    $taskPitch = $taskRegister.Pitch.ToString([System.Globalization.CultureInfo]::InvariantCulture)
    $taskInput = Join-Path $taskOutput "$($taskRegister.Base).wav"
    $taskDestination = Join-Path $taskOutput "$($taskRegister.Key).mp3"
    & ffmpeg -nostdin -v error -y -i $taskInput -af "rubberband=pitch=$taskPitch,loudnorm=I=-23:TP=-2:LRA=7" -ac 1 -ar 24000 -b:a 80k $taskDestination
    if ($LASTEXITCODE -ne 0) { throw "Could not prepare $($taskRegister.Key)" }
    Write-Output "$($taskRegister.Key) reference encoded."
}

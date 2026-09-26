# builds the softcam virtual camera dll (mit, https://github.com/tshino/softcam)
# from a pinned source release and drops it into src-tauri/resources/softcam.
# one patch is applied on the way: the shared objects get an open security
# descriptor, because sayvela runs elevated while the meeting app does not, and
# windows may otherwise refuse the app write access to memory the elevated side
# created. the checked-in dll was built without it; run this to replace it.
# requires visual studio build tools with the c++ desktop workload
$ErrorActionPreference = "Stop"

$Version = "1.8.1"
$Url = "https://github.com/tshino/softcam/archive/refs/tags/v$Version.zip"
$Sha256 = "3435f539b3b1e47d28af56f98fd301f6b2dd225383689c7cb1279dcbf7a8c562"

$Root = Split-Path -Parent $PSScriptRoot
$Out = Join-Path $Root "src-tauri\resources\softcam"
$Work = Join-Path $env:TEMP "sayvela-softcam-$Version"
$Src = Join-Path $Work "softcam-$Version"

function Patch($Path, $Old, $New) {
    $text = [IO.File]::ReadAllText($Path)
    if (-not $text.Contains($Old)) { throw "patch anchor not found in $Path" }
    [IO.File]::WriteAllText($Path, $text.Replace($Old, $New))
}

if (Test-Path $Work) { Remove-Item $Work -Recurse -Force }
New-Item $Work -ItemType Directory | Out-Null
$Zip = Join-Path $Work "src.zip"
Invoke-WebRequest $Url -OutFile $Zip
$actual = (Get-FileHash $Zip -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $Sha256) { throw "checksum mismatch: $actual" }
Expand-Archive $Zip -DestinationPath $Work

$Misc = Join-Path $Src "src\softcamcore\Misc.cpp"
Patch $Misc '#include <windows.h>' @'
#include <windows.h>
#include <sddl.h>

namespace {
// authenticated users may open the objects whatever their integrity level
struct OpenSecurity
{
    SECURITY_ATTRIBUTES attributes{ sizeof(SECURITY_ATTRIBUTES), nullptr, FALSE };
    OpenSecurity()
    {
        ConvertStringSecurityDescriptorToSecurityDescriptorA(
            "D:(A;;GA;;;AU)S:(ML;;NW;;;LW)", SDDL_REVISION_1,
            &attributes.lpSecurityDescriptor, nullptr);
    }
    ~OpenSecurity() { if (attributes.lpSecurityDescriptor) LocalFree(attributes.lpSecurityDescriptor); }
    SECURITY_ATTRIBUTES* get() { return attributes.lpSecurityDescriptor ? &attributes : nullptr; }
};
}
'@
Patch $Misc 'CreateMutexA(nullptr, false, name)' 'CreateMutexA(OpenSecurity().get(), false, name)'
Patch $Misc 'CreateFileMappingA(INVALID_HANDLE_VALUE, nullptr, PAGE_READWRITE, 0, size, name)' `
    'CreateFileMappingA(INVALID_HANDLE_VALUE, OpenSecurity().get(), PAGE_READWRITE, 0, size, name)'

$VsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$Vs = & $VsWhere -latest -products * -requires Microsoft.Component.MSBuild -property installationPath
if (-not $Vs) { throw "visual studio build tools with msbuild not found" }
$MsBuild = Join-Path $Vs "MSBuild\Current\Bin\MSBuild.exe"
# the project pins v143; newer toolsets build it unchanged
$Tools = (Get-ChildItem (Join-Path $Vs "VC\Tools\MSVC") | Sort-Object Name -Descending | Select-Object -First 1).Name
$Toolset = if ($Tools -like "14.5*") { "v145" } else { "v143" }

& $MsBuild (Join-Path $Src "src\softcam\softcam.vcxproj") -nologo -v:minimal -m `
    -p:Configuration=Release -p:Platform=x64 -p:PlatformToolset=$Toolset
if ($LASTEXITCODE -ne 0) { throw "msbuild failed" }

New-Item $Out -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $Src "src\softcam\x64\Release\softcam.dll") (Join-Path $Out "softcam.dll") -Force
Copy-Item (Join-Path $Src "LICENSE") (Join-Path $Out "LICENSE") -Force
Write-Host "softcam.dll v$Version -> $Out"

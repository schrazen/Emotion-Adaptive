# Emotion-Adaptive User Tester Install Guide (Windows)

This guide is for non-developers. Testers do not need Node.js, npm, VS Code, or Git.

## Before You Start

1. Use Windows 10 or Windows 11.
2. Make sure internet is available (for download).
3. Close old Emotion-Adaptive instances before installing/updating.

## Fastest Install (No Developer Setup)

### Method A: Click Download and Run (Recommended)

1. Open Releases:
   https://github.com/schrazen/Emotion-Adaptive/releases
2. Open the latest release.
3. Download one of these files:
   - Installer: file ending in `.exe` (usually NSIS installer)
   - Portable: file containing `Portable` and ending in `.exe`
4. If you downloaded Installer:
   - Double-click the installer.
   - Follow setup prompts (Next -> Install -> Finish).
5. If you downloaded Portable:
   - Put the `.exe` in a folder like `C:\EmotionAdaptive`.
   - Double-click the `.exe` to run.
6. If Windows SmartScreen appears:
   - Click `More info`.
   - Click `Run anyway`.

### Method B: One-Command PowerShell Download (No Repo Clone)

1. Open PowerShell.
2. Run this command exactly:

```powershell
powershell -ExecutionPolicy Bypass -NoProfile -Command "$owner='schrazen'; $repo='Emotion-Adaptive'; $headers=@{'User-Agent'='Emotion-Adaptive-Installer'}; $release=Invoke-RestMethod -Uri \"https://api.github.com/repos/$owner/$repo/releases/latest\" -Headers $headers; $asset=$release.assets | Where-Object { $_.name -like '*Portable*' -and $_.name -like '*.exe' } | Select-Object -First 1; if (-not $asset) { throw 'No portable release asset found.' }; $target=Join-Path $env:USERPROFILE 'Downloads\Emotion-Adaptive'; New-Item -ItemType Directory -Force -Path $target | Out-Null; $outFile=Join-Path $target $asset.name; Invoke-WebRequest -Uri $asset.browser_download_url -Headers $headers -OutFile $outFile; Write-Host \"Downloaded to: $outFile\""
```

3. Open the printed folder path.
4. Run the downloaded portable `.exe`.

## First-Run Test Checklist (for Testers)

1. App launches and main window appears.
2. Open Settings.
3. Toggle Auto-Theme ON and OFF.
4. Toggle Dark Mode ON and OFF.
5. Confirm colors update correctly.
6. Enable Character-only Widget Mode.
7. Verify widget opens.
8. Drag the widget.
9. Resize widget from bottom-right grip.
10. Double-click widget to return to full app.

## Tester Report Template (copy/paste)

- App launched successfully: Yes/No
- Install type used: Installer/Portable
- Auto-Theme: Good/Issue
- Dark Mode: Good/Issue
- Widget mode switch: Good/Issue
- Widget drag: Good/Issue
- Widget resize: Good/Issue
- Crash or freeze observed: Yes/No
- Exact steps before issue:
- Screenshot or screen recording attached: Yes/No

## Update Instructions (for a new testing build)

1. Close the app completely.
2. Download latest release again (Method A or B).
3. Installer users: run new installer.
4. Portable users: replace old portable `.exe` with new file.
5. Launch app and re-run the checklist.

## Uninstall Instructions

1. Installer version:
   - Windows Settings -> Apps -> Installed Apps.
   - Find `Emotion Adaptive` and uninstall.
2. Portable version:
   - Delete the portable `.exe` and its folder.

## Notes for Test Coordinator

1. Send testers this file only (no developer instructions).
2. Prefer Installer for non-technical users.
3. Ask testers to include exact local time and steps for every issue.

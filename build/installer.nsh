; Hooks into electron-builder's Windows installer (it includes build/installer.nsh itself).

!macro customInit
  ; An installer built for ARM64 alone holds no x64 app. On an x64 PC electron-builder would
  ; carry on anyway and leave shortcuts to a program it never installed, so refuse clearly.
  !ifdef APP_ARM64
    !ifndef APP_64
      ${IfNot} ${IsNativeARM64}
        MessageBox MB_OK|MB_ICONSTOP "This installer is for Windows on ARM. Download the x64 one (win-x64-setup.exe) instead." /SD IDOK
        SetErrorLevel 2
        Quit
      ${EndIf}
    !endif
  !endif
!macroend

; The installer keeps a copy of itself in %LOCALAPPDATA%\console-editor-updater, where the app also
; downloads updates: the next update downloads only what changed against it. Uninstalling removes the
; folder, except when an update runs the old uninstaller (the new installer may be running from it).
!macro customUnInstall
  ${ifNot} ${isUpdated}
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endif}
    RMDir /r "$LOCALAPPDATA\console-editor-updater"
    ${if} $installMode == "all"
      SetShellVarContext all
    ${endif}
  ${endif}
!macroend

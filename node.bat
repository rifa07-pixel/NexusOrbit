@echo off
rem NexusOrbit Node Runner
if exist "C:\Program Files\nodejs\node.exe" (
  "C:\Program Files\nodejs\node.exe" %*
) else if exist "C:\Users\syeda\AppData\Local\Programs\Microsoft VS Code\Code.exe" (
  set ELECTRON_RUN_AS_NODE=1
  "C:\Users\syeda\AppData\Local\Programs\Microsoft VS Code\Code.exe" %*
) else (
  echo Error: Node runtime not found.
  exit /b 1
)

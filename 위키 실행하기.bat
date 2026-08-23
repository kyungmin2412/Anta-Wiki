@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo   ANTA WIKI 를 켜는 중입니다
echo   ---------------------------------------------
echo.

where node >/dev/null 2>nul
if errorlevel 1 (
  echo   [X] Node.js 가 설치되어 있지 않습니다.
  echo.
  echo       https://nodejs.org 에 접속해서
  echo       LTS 라고 적힌 큰 버튼을 눌러 내려받고 설치한 뒤,
  echo       이 창을 닫고 이 파일을 다시 더블클릭하세요.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo   처음 실행이라 준비 작업을 합니다. 2~3분 걸립니다.
  echo   글자가 빠르게 올라가도 정상입니다. 기다려 주세요.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   [X] 준비 작업에 실패했습니다. 인터넷 연결을 확인해 주세요.
    pause
    exit /b 1
  )
  echo.
)

start /min cmd /c "timeout /t 9 >/dev/null & start \"\" http://localhost:3000"

echo   ---------------------------------------------
echo   잠시 뒤 브라우저가 저절로 열립니다.
echo   안 열리면 주소창에 직접 입력하세요:  http://localhost:3000
echo.
echo   * 이 검은 창을 닫으면 위키도 꺼집니다. 열어두세요.
echo   ---------------------------------------------
echo.

call npm run dev
pause

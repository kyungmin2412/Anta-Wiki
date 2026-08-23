@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo   ANTA WIKI 를 켜는 중입니다
echo   ---------------------------------------------
echo.

rem 압축을 풀지 않고 zip 안에서 실행하면 반드시 실패한다 - 먼저 걸러낸다.
if not exist "package.json" (
  echo   [X] 위키 파일을 찾을 수 없습니다.
  echo.
  echo       zip 파일 안에서 바로 실행하면 이렇게 됩니다.
  echo       zip 을 오른쪽 클릭 - "압축 풀기" 를 눌러 진짜 폴더를 만든 뒤,
  echo       그 폴더 안의 이 파일을 다시 더블클릭하세요.
  echo.
  echo       지금 위치: %CD%
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js 가 설치되어 있지 않습니다.
  echo.
  echo       https://nodejs.org 에 접속해서
  echo       LTS 라고 적힌 큰 버튼을 눌러 내려받고 설치하세요.
  echo       설치한 뒤 컴퓨터를 껐다 켜고 이 파일을 다시 더블클릭하세요.
  echo.
  pause
  exit /b 1
)

rem SQLite는 Node에 내장된 것을 쓴다. 실험 기능 경고가 사용자 화면을 어지럽히지 않게 끈다.
set NODE_OPTIONS=--disable-warning=ExperimentalWarning

if not exist node_modules (
  echo   처음 실행이라 준비 작업을 합니다. 2~3분 걸립니다.
  echo   노란 warn 글씨가 지나가도 정상입니다. 기다려 주세요.
  echo.
  rem 화면에 보여주면서 기록도 남긴다 - 실패했을 때 원인을 찾을 수 있도록.
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Continue'; npm install 2>&1 | Tee-Object -FilePath 설치기록.log; exit $LASTEXITCODE"
  if errorlevel 1 (
    echo.
    echo   ---------------------------------------------
    echo   [X] 준비 작업에 실패했습니다.
    echo.
    echo   원인은 이 폴더에 생긴 파일에 적혀 있습니다:
    echo.
    echo       설치기록.log
    echo.
    echo   이 파일을 그대로 보내주시면 원인을 알려드리겠습니다.
    echo.
    echo   자주 있는 원인:
    echo     1. 폴더 위치가 너무 깊음  - C:\안타위키 처럼 짧은 곳으로 옮기세요
    echo     2. 회사 네트워크 차단     - 집 와이파이나 휴대폰 핫스팟으로 시도하세요
    echo     3. 백신 프로그램 차단     - 잠시 끄고 다시 시도하세요
    echo   ---------------------------------------------
    echo.
    pause
    exit /b 1
  )
  echo.
)

start /min cmd /c "timeout /t 9 >nul & start http://localhost:3000"

echo   ---------------------------------------------
echo   잠시 뒤 브라우저가 저절로 열립니다.
echo   안 열리면 주소창에 직접 입력하세요:  http://localhost:3000
echo.
echo   * 이 검은 창을 닫으면 위키도 꺼집니다. 열어두세요.
echo   ---------------------------------------------
echo.

call npm run dev
pause

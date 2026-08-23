@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo   데모 데이터를 넣습니다 (삼성전자 - 리포트 8건, 애널리스트 4명)
echo   ※ 실제 리포트가 아니라 화면 확인용 가짜 데이터입니다.
echo   ※ 기존에 넣어둔 리포트가 있다면 모두 지워집니다.
echo.
pause

if not exist "package.json" (
  echo   [X] 위키 파일을 찾을 수 없습니다. zip 압축을 먼저 풀어주세요.
  pause
  exit /b 1
)
if not exist node_modules (
  echo   준비 작업을 먼저 합니다...
  call npm install
  if errorlevel 1 ( echo   [X] 준비 작업 실패. "위키 실행하기" 를 먼저 실행해 보세요. & pause & exit /b 1 )
)

call npm run seed:demo

echo.
echo   완료했습니다. "위키 실행하기" 를 더블클릭하세요.
pause

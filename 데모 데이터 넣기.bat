@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo   데모 데이터를 넣습니다 ^(삼성전자 · 리포트 8건 · 애널리스트 4명^)
echo   ※ 실제 리포트가 아니라 화면 확인용 가짜 데이터입니다.
echo   ※ 기존에 넣어둔 리포트가 있다면 모두 지워집니다.
echo.
pause

if not exist node_modules call npm install
call npm run seed:demo

echo.
echo   완료했습니다. 위키 실행하기 를 더블클릭하세요.
pause

@echo off
chcp 65001 > nul
cd /d "%~dp0"

if not exist "package.json" (
  echo   [X] 위키 파일을 찾을 수 없습니다. zip 압축을 먼저 풀어주세요.
  pause
  exit /b 1
)

set NODE_OPTIONS=--disable-warning=ExperimentalWarning
call npm run status

echo.
echo   위 '지금 보고 있는 폴더' 가 리포트를 넣은 폴더와 같은지 확인하세요.
echo   다르면 폴더가 두 개인 것이고, 각각 데이터가 따로 쌓입니다.
echo.
pause

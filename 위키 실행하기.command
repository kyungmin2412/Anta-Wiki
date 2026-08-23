#!/bin/bash
# 맥에서 더블클릭하면 위키가 켜집니다.
cd "$(dirname "$0")" || exit 1

echo ""
echo "  ANTA WIKI 를 켜는 중입니다"
echo "  ─────────────────────────────────────────"
echo ""

if ! command -v node > /dev/null 2>&1; then
  echo "  ✗ Node.js 가 설치되어 있지 않습니다."
  echo ""
  echo "    https://nodejs.org 에 접속해서"
  echo "    'LTS' 라고 적힌 큰 버튼을 눌러 내려받고 설치한 뒤,"
  echo "    이 창을 닫고 이 파일을 다시 더블클릭하세요."
  echo ""
  read -r -p "  엔터를 누르면 창이 닫힙니다..."
  exit 1
fi

MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [ "$MAJOR" -lt 20 ]; then
  echo "  ✗ Node.js 버전이 낮습니다 (현재 $(node -v), 20 이상 필요)"
  echo ""
  echo "    https://nodejs.org 에서 'LTS' 버튼을 눌러 최신 버전을 설치한 뒤"
  echo "    이 파일을 다시 더블클릭하세요."
  echo ""
  read -r -p "  엔터를 누르면 창이 닫힙니다..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  처음 실행이라 준비 작업을 합니다. 2~3분 걸립니다."
  echo "  글자가 빠르게 올라가도 정상입니다. 기다려 주세요."
  echo ""
  npm install || {
    echo ""
    echo "  ✗ 준비 작업에 실패했습니다. 인터넷 연결을 확인해 주세요."
    read -r -p "  엔터를 누르면 창이 닫힙니다..."
    exit 1
  }
  echo ""
fi

# 서버가 뜰 때쯤 브라우저를 대신 열어준다.
( sleep 9; open "http://localhost:3000" ) &

echo "  ─────────────────────────────────────────"
echo "  잠시 뒤 브라우저가 저절로 열립니다."
echo "  안 열리면 주소창에 직접 입력하세요:  http://localhost:3000"
echo ""
echo "  ★ 이 검은 창을 닫으면 위키도 꺼집니다. 열어두세요."
echo "  ─────────────────────────────────────────"
echo ""

npm run dev

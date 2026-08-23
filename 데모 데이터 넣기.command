#!/bin/bash
# 화면이 어떻게 생겼는지 보려고 넣는 가짜 데이터입니다. 실제 리포트가 아닙니다.
cd "$(dirname "$0")" || exit 1

echo ""
echo "  데모 데이터를 넣습니다 (삼성전자 · 리포트 8건 · 애널리스트 4명)"
echo "  ※ 실제 리포트가 아니라 화면 확인용 가짜 데이터입니다."
echo "  ※ 기존에 넣어둔 리포트가 있다면 모두 지워집니다."
echo ""
read -r -p "  계속하려면 엔터, 취소하려면 이 창을 닫으세요..."

if [ ! -d node_modules ]; then
  echo "  준비 작업을 먼저 합니다..."
  npm install || exit 1
fi

npm run seed:demo
echo ""
echo "  완료했습니다. '위키 실행하기' 를 더블클릭하세요."
read -r -p "  엔터를 누르면 창이 닫힙니다..."

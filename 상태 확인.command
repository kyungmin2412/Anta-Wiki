#!/bin/bash
# 위키에 무엇이 들어 있는지 확인합니다.
cd "$(dirname "$0")" || exit 1

if [ ! -f package.json ]; then
  echo "  ✗ 위키 파일을 찾을 수 없습니다. zip 압축을 먼저 풀어주세요."
  read -r -p "  엔터를 누르면 창이 닫힙니다..."
  exit 1
fi

export NODE_OPTIONS="--disable-warning=ExperimentalWarning"
npm run status

echo ""
echo "  위 '지금 보고 있는 폴더' 가 리포트를 넣은 폴더와 같은지 확인하세요."
echo "  다르면 폴더가 두 개인 것이고, 각각 데이터가 따로 쌓입니다."
echo ""
read -r -p "  엔터를 누르면 창이 닫힙니다..."

#!/bin/bash
# Claude Code 로 리포트를 위키에 넣습니다 (추가 결제 없음)
cd "$(dirname "$0")" || exit 1

echo ""
echo "  리포트를 위키에 넣습니다 (Claude Code 사용 — 추가 결제 없음)"
echo "  ─────────────────────────────────────────"
echo ""

if [ ! -f package.json ]; then
  echo "  ✗ 위키 파일을 찾을 수 없습니다. zip 압축을 먼저 풀어주세요."
  read -r -p "  엔터를 누르면 창이 닫힙니다..."
  exit 1
fi

mkdir -p reports

if ! ls reports/*.pdf > /dev/null 2>&1; then
  echo "  reports 폴더가 비어 있습니다."
  echo ""
  echo "  증권사 리포트 PDF 파일들을 이 폴더에 넣어주세요:"
  echo ""
  echo "      $(pwd)/reports"
  echo ""
  echo "  폴더를 열어드리겠습니다. PDF를 넣은 뒤 이 파일을 다시 더블클릭하세요."
  open reports
  echo ""
  read -r -p "  엔터를 누르면 창이 닫힙니다..."
  exit 0
fi

if ! command -v claude > /dev/null 2>&1; then
  echo "  Claude Code 가 설치되어 있지 않습니다."
  echo "  지금 설치합니다. 1~2분 걸립니다."
  echo ""
  if ! npm install -g @anthropic-ai/claude-code; then
    echo ""
    echo "  ✗ 설치에 실패했습니다. 이 화면을 캡처해서 보여주세요."
    read -r -p "  엔터를 누르면 창이 닫힙니다..."
    exit 1
  fi
  echo ""
  echo "  설치했습니다."
  echo ""
fi

echo "  ─────────────────────────────────────────"
echo "  Claude Code 를 시작합니다."
echo "  처음이라면 로그인 창이 열립니다 — 평소 쓰는 Claude 계정으로 로그인하세요."
echo "  그다음 리포트를 알아서 읽고 위키에 넣어줍니다."
echo "  ─────────────────────────────────────────"
echo ""

claude "reports 폴더에 있는 증권사 리포트 PDF를 모두 읽어서 위키에 넣어줘. 다 넣은 뒤에는 기업별로 종합 분석도 만들어줘."

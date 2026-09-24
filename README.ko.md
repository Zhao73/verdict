<p align="center"><img src="assets/logo.svg" width="96" alt="Verdict"></p>

<h1 align="center">Verdict</h1>

<p align="center">
  <b>어떤 종목이든 쓸 수 있는 리서치 데스크 — 터미널, Claude Code, Codex에서.</b><br>
  몇 초 만에 실시간 데이터 · 애널리스트 4명 병렬 조사 · 강세 대 약세 토론 · 가격 조건이 담긴 분명한 결론.
</p>

<p align="center"><a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a></p>

<p align="center"><img src="assets/app.svg" alt="Verdict 전체 화면 앱 (가상 기업 예시)" width="100%"></p>

## 무엇을 얻나요

`verdict 삼성전자 지금 사도 돼?`, `verdict 005930 실적 발표 전에 들고 있어도 돼?`처럼 물어보면 약 3분 뒤 다음을 받습니다.

- **결론**: 매수 · 비중확대 · 보유 · 비중축소 · 매도, 확신도, 그리고 질문에 대한 직접적인 답
- **가치 범위**: 약세 / 기본 / 강세 주당 가치와 현재가 대비 거리
- **가격 조건**: 피할 구간, 매수를 시작할 구간, 추가 매수 구간과 현재가의 위치
- **강세와 약세 논거**, 촉매, 리스크, 포지션 계획, 그리고 판단이 틀렸음을 보여줄 조건
- **출처가 달린 근거**와 공유할 수 있는 HTML 리포트(가격 차트 포함)

한국 주식은 `005930.KS`, `005930`, `KRX:005930`, "삼성전자" 모두 됩니다. 데스크는 DART 전자공시와 한국어 뉴스를 읽고, 결론은 한국어로 작성됩니다.

## 설치

```bash
npm install -g github:Zhao73/verdict
verdict doctor     # Node, 엔진, 데이터 소스 점검
verdict demo       # 키 없이 오프라인으로 가상 기업 체험
verdict            # 전체 화면 앱
```

엔진은 `ANTHROPIC_API_KEY`(가장 빠름) 또는 로그인된 Claude Code 중 하나를 자동으로 사용합니다.

## Claude Code / Codex

```text
/plugin marketplace add Zhao73/verdict
/plugin install verdict@verdict
```

`/verdict 삼성전자`처럼 쓰면 됩니다. Codex에서는 `codex plugin marketplace add Zhao73/verdict` 후 `@verdict 삼성전자 분석해줘`.

지원 언어는 11개(한국어·영어·중국어 간체/번체·일본어·프랑스어·독일어·스페인어·이탈리아어·포르투갈어·네덜란드어), 지원 시장은 미국·한국·일본·중국·홍콩·대만·영국·유럽·호주 등입니다. 자세한 내용은 [English README](README.md#languages--markets)를 참고하세요.

<sub>공개 자료를 바탕으로 AI가 생성한 리서치입니다. 투자 조언이 아니며 틀릴 수 있습니다. MIT 라이선스.</sub>

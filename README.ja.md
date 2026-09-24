<p align="center"><img src="assets/logo.svg" width="96" alt="Verdict"></p>

<h1 align="center">Verdict</h1>

<p align="center">
  <b>どんな銘柄にも使えるリサーチデスク — ターミナル、Claude Code、Codex で。</b><br>
  数秒でライブデータ · 4 人のアナリストが並列調査 · 強気と弱気の討論 · 価格条件つきの明確な結論。
</p>

<p align="center"><a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ko.md">한국어</a></p>

<p align="center"><img src="assets/app.svg" alt="Verdict のフルスクリーンアプリ（架空の企業の例）" width="100%"></p>

## できること

`verdict トヨタは今割安ですか`、`verdict 7203`、`verdict ソニー 決算前に持つべき？` のように話しかけると、約 3 分で次が揃います。

- **結論**：買い・オーバーウェイト・ホールド・アンダーウェイト・売り、確信度、そして質問への直接の回答
- **価値レンジ**：弱気 / 基本 / 強気の 1 株あたり価値と、現在値からの距離
- **価格条件**：見送る水準、買い始める水準、買い増す水準と、現在値がどこにあるか
- **強気と弱気の論拠**、カタリスト、リスク、ポジション案、そして見方が崩れる条件
- **出典つきの根拠**と、共有できる HTML レポート（価格チャート付き）

日本株は `7203.T`・`7203`・`TYO:7203`・「トヨタ」のどれでも指定できます。デスクは EDINET / TDnet と日本語のニュースを読み、結論は日本語で書かれます。

## インストール

```bash
npm install -g github:Zhao73/verdict
verdict doctor     # Node・エンジン・データソースを確認
verdict demo       # キー不要・オフラインで架空の企業を試す
verdict            # フルスクリーンアプリ
```

エンジンは `ANTHROPIC_API_KEY`（最速）またはログイン済みの Claude Code のどちらかを自動で使います。

## Claude Code / Codex

```text
/plugin marketplace add Zhao73/verdict
/plugin install verdict@verdict
```

`/verdict トヨタ` のように使えます。Codex では `codex plugin marketplace add Zhao73/verdict` のあと `@verdict トヨタを調べて`。

対応言語は 11（日本語・英語・中国語簡体字/繁体字・韓国語・仏・独・西・伊・葡・蘭）、対応市場は米国・日本・中国・香港・台湾・韓国・英国・欧州・豪州など。詳細は [English README](README.md#languages--markets) をご覧ください。

<sub>公開情報をもとに AI が生成したリサーチです。投資助言ではなく、誤りを含むことがあります。MIT ライセンス。</sub>

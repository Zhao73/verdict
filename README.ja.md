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
- **Verdict スコア（0–100）**：価値・根拠・ファンダメンタルズ・値動きをコードが 1 つの数字にまとめ、レーティングを検証
- **価値レンジ**：弱気 / 基本 / 強気の 1 株あたり価値と、現在値からの距離
- **確率つきの価格条件**：見送る水準、買い始める水準、買い増す水準、現在値の位置、そして 3 か月以内に各水準へ届く確率
- **強気と弱気の論拠**、カタリスト、リスク、ポジション案、そして見方が崩れる条件
- **出典つきの根拠**と、共有できる HTML レポート（価格チャート付き）

日本株は `7203.T`・`7203`・`TYO:7203`・「トヨタ」のどれでも指定できます。デスクは EDINET / TDnet と日本語のニュースを読み、結論は日本語で書かれます。

## Verdict 独自メソッド

モデルは調査・討論・判断を担い、**計算はコードが行います**。7 つのメソッドが、モデルが書き始める前に論点の枠組みを示し、結論が出たあとにそれを検証します。

- **株価に織り込まれた成長**（逆 DCF）：現在の株価が前提とする今後 10 年の成長率と、実際の成長率との差
- **オプションの予想変動**：オプション市場が織り込む ± の値幅と、それが直近の実績より大きいかどうか
- **相場状態**：トレンド × ボラティリティの局面と、タイミングへの示唆
- **到達確率**：3 か月以内に各価格帯へ届く確率
- **ペイオフ**：シナリオ加重の価値、上値と下値、リワード/リスク
- **根拠のバランス**：各デスクの発見を情報源の質（開示資料 > 主要紙 > 見出し）で加重
- **整合性チェック**：レーティングが根拠・価値・ペイオフと逆方向なら ⚠ で表示

これらは **Verdict スコア**にまとまります。スコアがレーティングを書き換えることはありません。数式と閾値は [docs/METHODS.md](docs/METHODS.md)（英語）にあります。`verdict methods 7203` で最初の 3 つをモデルなしで確認できます。

<p align="center"><img src="assets/methods.svg" alt="Verdict スコア、確率つきの価格条件、各メソッド" width="100%"></p>

## 言語の選択

既定では、質問した言語で答えます。言語を固定したいときは一度選ぶだけです。ターミナルでは `verdict lang`（番号つきの一覧）か `verdict lang ja`、アプリでは `/lang` を使います。選んだ言語は保存され、`verdict lang auto` で自動に戻ります。1 回だけ変えたいときは `--lang` を使います。

## インストール

```bash
npm install -g github:Zhao73/verdict
verdict doctor     # Node・エンジン・データソースを確認
verdict demo       # キー不要・オフラインで架空の企業を試す
verdict            # フルスクリーンアプリ
```

エンジンは `ANTHROPIC_API_KEY`（最速）またはログイン済みの Claude Code のどちらかを自動で使います。

### Windows

Windows 10 / 11 でそのまま動きます（WSL は不要）。

```powershell
winget install OpenJS.NodeJS.LTS
npm install -g github:Zhao73/verdict
verdict doctor
```

フルスクリーンアプリは **Windows Terminal** での利用をおすすめします。Claude Code は `claude.exe`（公式インストーラー）でも `claude.cmd`（npm）でも自動で見つかります。

## Claude Code / Codex

```text
/plugin marketplace add Zhao73/verdict
/plugin install verdict@verdict
```

`/verdict トヨタ` のように使えます。Codex では `codex plugin marketplace add Zhao73/verdict` のあと `@verdict トヨタを調べて`。

対応言語は 11（日本語・英語・中国語簡体字/繁体字・韓国語・仏・独・西・伊・葡・蘭）、対応市場は米国・日本・中国・香港・台湾・韓国・英国・欧州・豪州など。詳細は [English README](README.md#languages--markets) をご覧ください。

<sub>公開情報をもとに AI が生成したリサーチです。投資助言ではなく、誤りを含むことがあります。MIT ライセンス。</sub>

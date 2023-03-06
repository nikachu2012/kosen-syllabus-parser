# kosen-syllabus-parser
高専のシラバスをスクレイピングするコードです。

## 必要なもの
Node.js

## 使用方法
1. `npm i`
1. `config.json`の`url`の値にスクレイピングする学科トップページのURLを入れる
1. `npm run start`を実行
1. 終了後に`npm run course_start`を実行

## 注意事項
`course.js`は`dist/courseURL.json`に配列区切りのパース用URLが存在しない場合エラーが発生します。

## npm scripts
```shell
npm run start
# 開講科目一覧ページを１回生成
```
```shell
npm run dev
# 開講科目一覧ページをnodemonで実行
```
```shell
npm run course_start
# 科目詳細ページを１回生成
```
```shell
npm run course_start
# 科目詳細ページをnodemonで実行
```

## 動作確認済みページ
[沼津高専 制御情報工学科 開講科目一覧](https://syllabus.kosen-k.go.jp/Pages/PublicSubjects?school_id=22&department_id=15&year=2022&lang=ja)
[コンピュータ基礎演習](https://syllabus.kosen-k.go.jp/Pages/PublicSyllabus?school_id=22&department_id=15&subject_code=2022-540&year=2022&lang=ja)
[プログラミング演習応用](https://syllabus.kosen-k.go.jp/Pages/PublicSyllabus?school_id=22&department_id=15&subject_code=2022-980&year=2022&lang=ja)

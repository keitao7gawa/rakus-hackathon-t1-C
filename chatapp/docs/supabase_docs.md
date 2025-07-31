# supabaseの利用方法

## supabaseの導入

https://supabase.com/docs/guides/getting-started/quickstarts/vue

上記サイトを参照するとできます。

git pullをすることによって変わったファイル
1. lib/supabaseClient.js: supabaseのクライアントを生成するためのスクリプト
2. App.vue: supabase側で作っているテーブルからデータを取得するためのコードなどを追加
3. .env.local: supabaseと認証するための環境変数2つを記入する場所
4. docs/supabase_docs.md: このドキュメント

手順
1. git pullでstagingブランチの最新の情報を取得
2. npm installを実行（package.jsonにあるsupabaseのライブラリをインストール）
3. .env.localの2つの環境変数を指定（Slackで共有）

## 基本構文
SQLでの操作は基本的にSELECT、INSERT、UPDATE、DELETEになるので、その記法をまとめます。

### SELECT
const {data, error} = await supabase.from('TableName').select() // 非同期処理

### INSERT
const { error } = await supabase
    .from('TableName')
    .insert([{ column_name1: data1, column_name2: data2 }])
なお、一般に、create_atやidは自動的に割り当てられるので（そういう風に設定をするので、こちらでは指定は不要）

### UPDATE
const { data, error } = await supabase
    .from("TableName")
    .update({ column_name1: 'after'}) // column_name1を'after'に上書き（update）する
    .eq('column_name2', 1) // column_name2が1のものが対象

### DELETE
const { data, error } = await supabase
    .from("TableName")
    .delete() // レコード（行）を削除
    .eq('column_name', 1) // column_nameが1のものが対象
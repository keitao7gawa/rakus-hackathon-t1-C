# hackathon-chatapp
- RAKUS Tech Lab (3日間のインターン)にて，開発した「絶対投稿見させるチャット」である．
### 背景
- ペルソナ：RAKUS大学 学園祭実行委員会
- 最重要課題：重要な情報を見逃してしまう，重要な情報がどこにあるわからない．
  - Slackを使用し，次のような課題を抱えると想定した．
    - 重要な投稿の後に会話が続くと流れてしまう．
    - Slackを PCでしか確認せず，連絡を見逃すメンバーがいる．
    - どこのチャンネルで見たのかわからなくなる．
- 実現したいこと：重要な情報を絶対に見させるチャットアプリ
    - 重要な投稿をまとめる機能を持つ．
    - スマホや PCに関わらずいつでも閲覧できる．

## 機能
### 技術概要
- フロントエンド
  - Vue.js 3.0
  - Vite
  - Vue Router
  - Socket.IO Client
  - Bootstrap 5

- バックエンド
  - Node.js
  - Express
  - Socket.IO
  - Supabase (PostgreSQL)
### 基本要件
- 指定された基本要件について紹介し，担当した機能について太字で強調する．

#### ログイン画面

- **ユーザ名が未入力で「入室する」が押されたらエラーダイアログを表示する**
  - `chatapp/src/components/Login.vue`: 23行目 ~
    ```javascript
    if (inputUserName.value.trim() === "") {
        alert("ユーザー名を入力してください");
        return;
    }
    ```

#### チャット画面

- ログイン画面で入力されたユーザ名に「さん」を加えて表示する
  - 入力：山田太郎
  - 表示：ログインユーザ：山田太郎さん
- 「投稿」ボタンでメッセージを投稿する
  - 投稿されたメッセージは自分を含め、すべてのクライアントに投稿者名とともに表示される
  - 例） ○○○○ さん：（投稿文）
- **「メモ」ボタンでメモを投稿する**
  - 投稿されたメモは自分にだけ表示される
  - 例） ○○○○ さんのメモ：（投稿文）
  - `chatapp/src/components/Chat.vue`: 250行目 ~
  ```javascript
  const onMemo = () => {
    // 空白のメモ内容はアラートを表示
    if (chatContent.value.trim() === "") {
      alert("メモ内容を入力してください");
      return;
    }
    // メモの内容を表示
    const newChat = {
      context: chatContent.value,
      userName: userName.value,
      publishTime: new Date().toLocaleString(),
      dataType: "memo",
      uid: crypto.randomUUID(),
      isPinned: is_pin.value,
    };
    // 一番下にスクロールするためのフラグを立てる
    isBottomMarkerVisible.value = true; // メモを追加した後にスクロール

    // メモをデータベースに挿入
    insertMessageTable(newChat);
    // メモの内容をチャットリストに追加
    chatList.push(newChat);

    // 入力欄を初期化
    chatContent.value = "";
  };
  ```
- 投稿は新しい順に表示される
- ユーザの入退室時に自分を除いた他のクライアントに入退室のメッセージが表示される
  - 入室の例） ○○○○ さんが入室しました
  - 退室の例） ○○○○ さんが退室しました

### 追加要件
- 基本要件に加え複数の追加機能を実装した．
- 担当した機能について，紹介する．

#### チャット編集機能
- 編集ボタンを押すことで，編集モードに入りメッセージの編集をできるようにした．
  - 別クライアント上で表示されているメッセージ，データベース上のメッセージを更新する．
  - 編集したか把握できるように，編集後のメッセージには強制的に "編集済み" の文字が追加されるようにした．

![edit-gif](https://github.com/user-attachments/assets/2aaf89dd-6f92-475b-9765-3f0ba77f150b)

#### フィルタ機能
- トグルスイッチで，重要に設定したメッセージのみを表示するかしないか切り替えれるようにした．
- セレクトリストで，表示されるチャットについて全て・投稿のみ・メモのみを切り替えれるようにした．

![filter-gif](https://github.com/user-attachments/assets/3a81cbc8-06c1-4227-805f-11c4de303aa7)

## アプリの起動

1. 次のコマンドを実行します

   ```bash
   # アプリのディレクトリに移動
   cd ~/hackathon/chatapp
   # アプリの開発で使用するライブラリをインストール（初回のみ）
   npm ci
   # 起動コマンドを実行
   npm run start
   ```

2. `http://サーバのIPアドレス:ポート番号/` にブラウザでアクセスします

   例：`http://127.0.0.1:3000/`

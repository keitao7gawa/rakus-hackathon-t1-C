<script setup>
import { inject, ref, reactive, onMounted } from "vue";
import socketManager from "../socketManager.js";

// #region global state
const userName = inject("userName");
// #endregion

// #region local variable
const socket = socketManager.getInstance();
// #endregion

// #region reactive variable
const chatContent = ref("");
const chatList = reactive([]);
// #endregion

// #region lifecycle
onMounted(() => {
	registerSocketEvent();
});
// #endregion

// #region browser event handler
// 投稿メッセージをサーバに送信する
const onPublish = () => {
	// 入力欄を初期化
};

// 退室メッセージをサーバに送信する
const onExit = () => {};

// メモを画面上に表示する
const onMemo = () => {
	// メモの内容を表示
	// 入力欄を初期化
};
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ画面上に表示する
const onReceiveEnter = (data) => {
	chatList.push();
};

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
	chatList.push();
};

// サーバから受信した投稿メッセージを画面上に表示する
const onReceivePublish = (data) => {
	chatList.push();
};
// #endregion

// #region local methods
// イベント登録をまとめる
const registerSocketEvent = () => {
	// 入室イベントを受け取ったら実行
	socket.on("enterEvent", (data) => {});

	// 退室イベントを受け取ったら実行
	socket.on("exitEvent", (data) => {});

	// 投稿イベントを受け取ったら実行
	socket.on("publishEvent", (data) => {});
};
// #endregion
</script>

<template>
	<div class="mx-auto my-5 px-4">
		<div class="header">
			<p class="d-flex align-center mt-4 ml-4">{{ userName }}あああさん</p>
			<div class="d-flex align-center mt-4">
				<select class="select" name="messageType" id="message-type-select">
					<option value="important">重要</option>
					<option value="all">全て</option>
				</select>
				<router-link to="/" class="link">
					<button
						type="button"
						class="button-normal button-exit"
						@click="onExit"
					>
						退室する
					</button>
				</router-link>
			</div>
		</div>
		<div class="message-area">
			<div class="mt-5" v-if="chatList.length !== 0">
				<ul>
					<li class="item mt-4" v-for="(chat, i) in chatList" :key="i">
						{{ chat }}
					</li>
				</ul>
			</div>
		</div>
		<div class="mt-10 footer">
			<textarea
				variant="outlined"
				placeholder="投稿文を入力してください"
				rows="4"
				class="area"
			></textarea>
			<div class="bottun-wrapper">
				<button class="mb-1 ml-3 button-normal">メモ</button>
				<button class="mt-1 ml-3 button-normal">投稿</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.header {
	display: flex;
	justify-content: space-between;
	width: 100%;
	position: fixed;
	top: 0;
	left: 0;
}
.footer {
	display: flex;
	justify-content: center;
	width: 100%;
	position: fixed;
	bottom: 0;
	left: 0;
	padding: 15px 0;
}
.message-area {
	/* height: 5000px; */
}
.bottun-wrapper {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}
.link {
	text-decoration: none;
}

.area {
	width: 70%;
	border: 1px solid #000;
	background-color: #ffffff;
	padding: 8px;
}
.select {
	margin-right: 4px;
	font-size: 0.9rem;
	padding: 2px 5px;
	-moz-appearance: menulist;
	-webkit-appearance: menulist;
	border: 1px solid #000;
	background-color: #ffffff;
}
.item {
	display: block;
}

.util-ml-8px {
	margin-left: 8px;
}

.button-exit {
	color: #000;
	margin: 0 4px;
}
</style>

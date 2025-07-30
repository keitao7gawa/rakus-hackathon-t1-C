<script setup>
import { inject, ref } from "vue";
import { useRouter } from "vue-router";
import socketManager from "../socketManager.js";

// #region global state
const userName = inject("userName");
// #endregion

// #region local variable
const router = useRouter();
const socket = socketManager.getInstance();
// #endregion

// #region reactive variable
const inputUserName = ref("");
// #endregion

// #region browser event handler
// 入室メッセージをクライアントに送信する
const onEnter = () => {
	// ユーザー名が入力されているかチェック
	if (inputUserName.value === "") {
		alert("ユーザー名を入力してください");
		return;
	}
	// 入室メッセージを送信
	socket.emit("enterEvent", inputUserName.value);

	// 全体で使用するnameに入力されたユーザー名を格納
	userName.value = inputUserName.value;

	// チャット画面へ遷移
	router.push({ name: "chat" });
};
// #endregion
</script>

<template>
	<div class="mx-auto my-5 px-4 login-wrapper">
		<h1 class="title d-flex flex-column align-center">
			<span>絶対投稿見させる</span><span>チャット</span>
		</h1>
		<div class="mt-10 d-flex flex-column justify-center">
			<input
				type="text"
				placeholder="ユーザー名"
				class="user-name-text"
				v-model="inputUserName"
			/>
		</div>
		<button type="button" @click="onEnter" class="button-normal">
			入室する
		</button>
	</div>
</template>

<style scoped>
.login-wrapper {
	display: flex;
	flex-direction: column;
	justify-content: center;
	background-color: #ffffff;
	padding: 50px 16px;
	border-radius: 30px;
}
@media screen and (min-width: 500px) {
	.title {
		font-size: 3rem;
		font-weight: 400;
		line-height: 1.05;
		letter-spacing: normal;
	}
}
@media screen and (max-width: 500px) {
	.title {
		font-size: 2rem;
		font-weight: 400;
		line-height: 1.05;
		letter-spacing: normal;
	}
}
.user-name-text {
	border: 1px solid #888;
	margin-bottom: 16px;
	background-color: #ffffff;
	padding: 2px 2px 2px 6px;
}
</style>

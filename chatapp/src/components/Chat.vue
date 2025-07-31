<script setup>
import { inject, ref, reactive, onMounted, watch, nextTick, computed } from "vue";
import socketManager from "../socketManager.js";
import { supabase } from "../lib/supabaseClient";

// #region global state
const userName = inject("userName");
// #endregion

// #region local variable
const socket = socketManager.getInstance();
// #endregion

// #region reactive variable
const chatContent = ref("");
const chatList = reactive([]);
const viewImportantStatus = ref(true);
const selectedStatus = ref("all"); 
// #endregion

// #region lifecycle
onMounted(() => {
	// チャットリストを初期化
	chatList.length = 0;
	// データベースからメッセージを取得
	fetchMessageTable();
	// ソケットイベントを登録
	registerSocketEvent();
});

// DBからメッセージを取得してchatListを更新する
const fetchMessageTable = async () => {
	try {
		const { data, error } = await supabase
			.from("MessageTable")
			.select("*")
			.order("publish_time", { ascending: true });
		if (error) {
			console.error("Error fetching messages:", error);
			return;
		}
		// 取得したメッセージをchatListに追加
		data.forEach((message) => {
			if (
				message.data_type === "memo" &&
				message.user_name !== userName.value
			) {
				return; // 他人のメモはリストに追加しない
			}
			chatList.push({
				context: message.context,
				userName: message.user_name,
				publishTime: new Date(message.publish_time).toLocaleString(),
				dataType: message.data_type,
				uid: message.uid,
				isPinned: message.is_pinned,
			});
		});
	} catch (error) {
		console.error("Error fetching messages:", error);
	}
};

// MessageTableに insertするための関数
const insertMessageTable = async (chat) => {
	// 例: supabaseを使用
	// supabase.from('MessageTable').insert(message).then(response => {
	// 	if (response.error) {
	// 		alert("メッセージの送信に失敗しました: " + response.error.message);
	// 	}
	// });

	// データベースにメッセージを挿入する
	try {
		const { error } = await supabase.from("MessageTable").insert({
			context: chat.context,
			user_name: chat.userName,
			publish_time: chat.publishTime,
			data_type: chat.dataType,
			uid: chat.uid,
			is_pinned: chat.isPinned,
		});
	} catch (error) {
		alert("メッセージの送信に失敗しました: " + error.message);
		return;
	}
};
// #endregion

const filteredChatList = computed(() => {
	const tempChatList = chatList.filter((chat) => {
		if (selectedStatus.value === "all") {
			return true; // 全てのメッセージを表示
		} else if (selectedStatus.value === "memo") {
			return chat.dataType === "memo"; // メモのみ表示
		} else if (selectedStatus.value === "message") {
			return chat.dataType === "message"; // 投稿のみ表示
		}
		return false;
	});
	if (viewImportantStatus.value) {
		return tempChatList.filter((chat) => chat.isPinned); // 重要なメッセージのみ表示
	} else {
		return tempChatList; 
	}
});

// #region browser event handler
// 投稿メッセージをサーバに送信する
const onPublish = () => {
	// 入力欄が空ならアラートを表示
	if (chatContent.value.trim() === "") {
		alert("投稿内容を入力してください");
		return;
	}
	// 入力欄を初期化
	const newChat = {
		context: chatContent.value,
		userName: userName.value,
		publishTime: new Date().toLocaleString(),
		dataType: "message",
		uid: crypto.randomUUID(),
		isPinned: false,
	};
	// メッセージをデータベースに挿入
	insertMessageTable(newChat);
	chatContent.value = "";

	// 投稿メッセージをサーバに送信
	socket.emit("publishEvent", newChat);
};

// 退室メッセージをサーバに送信する
const onExit = () => {
	socket.emit("exitEvent", userName.value);
};

// メモを画面上に表示する
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
		isPinned: false,
	};
	// メモをデータベースに挿入
	insertMessageTable(newChat);
	// メモの内容をチャットリストに追加
	chatList.push(newChat);

	// 入力欄を初期化
	chatContent.value = "";
};

// 投稿メッセージ入力欄でEnterキーが押されたときの処理
// Ctrl + Enter または Command + Enter で投稿
const handleChatContentKeydown = (event) => {
	if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
		event.preventDefault(); // Enterキーのデフォルト動作を防ぐ
		// 投稿メッセージをサーバに送信
		onPublish();
	}
};
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ画面上に表示する
const onReceiveEnter = (data) => {
	const enterMessage = data + "さんが入室しました";
	const newChat = {
		context: enterMessage,
		userName: "System",
		publishTime: new Date().toLocaleString(),
		dataType: "enter",
		uid: crypto.randomUUID(),
		isPinned: false,
	};
	chatList.push(newChat);
};

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
	const exitMessage = data + "さんが退出しました";
	const newChat = {
		context: exitMessage,
		userName: "System",
		publishTime: new Date().toLocaleString(),
		dataType: "exit",
		uid: crypto.randomUUID(),
		isPinned: false,
	};
	chatList.push(newChat);
};

// サーバから受信した投稿メッセージを画面上に表示する
const onReceivePublish = (data) => {
	chatList.push(data);
};
// #endregion

// #region local methods
// イベント登録をまとめる
const registerSocketEvent = () => {
	// 入室イベントを受け取ったら実行
	socket.on("enterEvent", (data) => {
		onReceiveEnter(data);
	});

	// 退室イベントを受け取ったら実行
	socket.on("exitEvent", (data) => {
		onReceiveExit(data);
	});

	// 投稿イベントを受け取ったら実行
	socket.on("publishEvent", (data) => {
		onReceivePublish(data);
	});
};

// 自動で下までスクロールする機能
const bottomMarker = ref(null);
watch(filteredChatList, async () => {
	await nextTick();
	bottomMarker.value?.scrollIntoView({ behavior: "smooth" });
});
// #endregion
</script>

<template>
	<div class="mx-auto my-5 px-4">
		<div class="header">
			<p class="d-flex align-center mt-4 ml-4 mb-4">{{ userName }}さん</p>
			<div class="d-flex align-center mt-4 mb-4">
				<label for="view-important">重要</label>
				<input type="checkbox" id="view-important" v-model="viewImportantStatus" />
				<select class="select" name="messageType" id="message-type-select" v-model="selectedStatus">
					<option value="all">全て</option>
					<option value="message">投稿</option>
					<option value="memo">メモ</option>
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
			<div class="mt-5" v-if="filteredChatList.length !== 0">
				<div class="item mt-4" v-for="(chat, i) in filteredChatList" :key="i">
					<strong>
						<template v-if="chat.dataType === 'message'"
							>{{ chat.userName }} さん</template
						>
						<template
							v-else-if="chat.dataType === 'enter' || chat.dataType === 'exit'"
							>⚙️システム</template
						>
						<template v-else>📝メモ</template>
					</strong>
					<small class="util-ml-8px">{{ chat.publishTime }}</small>
					<br />
					{{ chat.context }}
				</div>
				<div ref="bottomMarker"></div>
			</div>
		</div>
		<div class="footer">
			<textarea
				variant="outlined"
				placeholder="投稿文を入力してください"
				rows="4"
				v-model="chatContent"
				class="area"
				@keydown="handleChatContentKeydown"
			></textarea>
			<div class="bottun-wrapper">
				<button @click="onMemo" class="mb-1 ml-3 button-normal">メモ</button>
				<button @click="onPublish" class="mt-1 ml-3 button-normal">投稿</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
.header {
	display: flex;
	justify-content: space-between;
	width: 100%;
	height: 50px;
	position: fixed;
	top: 0;
	left: 0;
	background-color: #ff9a07;
}
.footer {
	display: flex;
	justify-content: center;
	width: 100%;
	position: fixed;
	bottom: 0;
	left: 0;
	padding: 15px 0;
	height: 150px;
	background-color: #ff9a07;
}
.message-area {
	margin: 50px 0 150px 0;
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
	white-space: pre-wrap;
}
.util-ml-8px {
	margin-left: 8px;
}

.button-exit {
	color: #000;
	margin: 0 4px;
}
</style>

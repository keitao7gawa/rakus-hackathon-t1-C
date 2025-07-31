<script setup>
import {
	inject,
	ref,
	reactive,
	onMounted,
	watch,
	nextTick,
	computed,
} from "vue";
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
const isMenuInOpen = ref(false); // メニューの開閉状態を管理
const currentChat = ref(null); // 編集中のチャットを保持
const viewImportantStatus = ref(true);
const selectedStatus = ref("all");
const is_pin = ref(false);
const editingChat = ref(null); // 編集中のチャットを保持
const isEditing = ref(false); // 編集モードの状態を管理
const is_scrolled = ref(false);
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

// MessageTableからdeleteするための関数
const deleteMessageTable = async (uid) => {
	try {
		const { error } = await supabase
			.from("MessageTable")
			.delete() // レコード（行）を削除
			.eq("uid", uid);
	} catch (error) {
		alert("メッセージの削除に失敗しました: " + error.message);
		return;
	}
};

// MessageTableのレコードを更新するための関数
const updateMessageTable = async (chat) => {
	try {
		const { error } = await supabase
			.from("MessageTable")
			.update({
				context: chat.context,
				user_name: chat.userName,
				publish_time: chat.publishTime,
				data_type: chat.dataType,
				is_pinned: chat.isPinned,
			})
			.eq("uid", chat.uid);
		if (error) {
			alert("メッセージの更新に失敗しました: " + error.message);
		}
	} catch (error) {
		alert("メッセージの更新に失敗しました: " + error.message);
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
// 編集を開始する関数
const startEditing = (chat) => {
	if (chat.dataType === "enter" || chat.userName !== userName.value) {
		return;
	}
	editingChat.value = { ...chat }; // 編集用のチャットをコピー
	isEditing.value = true; // 編集モードにする
	isMenuInOpen.value = false; // メニューを閉じる
};

// 編集を完了する関数
const finishEditing = () => {
	if (!editingChat.value) return; // 編集中のチャットがない場合は何もしない
	// 編集内容をデータベースに更新
	const originalChat = chatList.find(
		(chat) => chat.uid === editingChat.value.uid
	);
	if (originalChat) {
		originalChat.context = editingChat.value.context + " (編集済み)";
		originalChat.isPinned = editingChat.value.isPinned;
		updateMessageTable(originalChat);

		socket.emit("updateEvent", originalChat); // 更新イベントをサーバに送信
	}
	editingChat.value = null; // 編集を終了
	isEditing.value = false; // 編集モードを終了
};

const cancelEditing = () => {
	editingChat.value = null; // 編集中のチャットをリセット
	isEditing.value = false; // 編集モードを終了
	isMenuInOpen.value = false; // メニューを閉じる
};

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
		isPinned: is_pin.value,
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

// 削除したことをサーバーに送信する
const onDelete = (uid, name) => {
	// uidによって削除する処理を以下で行う
	if (name !== userName.value) return;
	console.log("onDelete");

	socket.emit("deleteEvent", uid);
	deleteMessageTable(uid);
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
		isPinned: is_pin.value,
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

// サーバーから受信した削除通知を受け取り、メッセージなどを削除する
const onReceiveDelete = (uid) => {
	// chatListを走査して、uidが一致したものを削除する処理

	const indexToDelete = chatList.findIndex((chat) => chat.uid === uid);

	if (indexToDelete !== -1) {
		chatList.splice(indexToDelete, 1);
	}
};

const onReceiveUpdate = (data) => {
	const chatToUpdate = chatList.find((chat) => chat.uid === data.uid);
	if (chatToUpdate) {
		chatToUpdate.context = data.context;
	}
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

	// 削除イベントを受け取ったら実行
	socket.on("deleteEvent", (uid) => {
		onReceiveDelete(uid);
	});

	socket.on("updateEvent", (data) => {
		onReceiveUpdate(data);
	});
};

// 自動で下までスクロールする機能
const bottomMarker = ref(null);
watch(filteredChatList, async () => {
	await nextTick();
	bottomMarker.value?.scrollIntoView({ behavior: "smooth" });
});

const getChatClass = (chat) => {
	if (chat.dataType === "memo") {
		return "memo-bgcolor";
	} else if (chat.dataType === "enter" || chat.dataType === "exit") {
		return "system-bgcolor";
	} else if (chat.userName === userName.value) {
		return "my-bgcolor";
	} else {
		return "other-bgcolor";
	}
};
// 一番下までスクロールする関数
const scrollDown = async () => {
	await nextTick();
	bottomMarker.value?.scrollIntoView({ behavior: "smooth" });
};

onMounted(() => {
	nextTick(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						// 画面に要素が入ったときの処理
						is_scrolled.value = false;
					} else {
						// 画面から要素が出たときの処理
						is_scrolled.value = true;
					}
				});
			},
			{
				threshold: 1.0,
			}
		);
		if (bottomMarker.value) {
			observer.observe(bottomMarker.value);
		}
	});
});

// #endregion

const is_sort_reverse = ref(false);
</script>

<template>
	<div class="mx-auto my-5 px-4">
		<div v-if="is_scrolled" class="scroll-down" @click="scrollDown">↓</div>
		<div class="header">
			<p class="d-flex align-center pt-1 pl-1 pb-1 font-weight-bold">
				{{ userName }}さん
			</p>
			<div class="d-flex align-center filter-wrapper">
				<v-switch
					color="#7CB5BE"
					hide-details="auto"
					class="mr-4"
					label="ソート"
					v-model="is_sort_reverse"
				></v-switch>
				<v-switch
					hide-details="auto"
					id="view-important"
					class="mr-4"
					v-model="viewImportantStatus"
					label="重要"
					color="#7CB5BE"
				/>

				<select
					class="select"
					name="messageType"
					id="message-type-select"
					v-model="selectedStatus"
				>
					<option value="all">全て</option>
					<option value="message">投稿</option>
					<option value="memo">メモ</option>
				</select>
			</div>
			<router-link to="/" class="link">
				<button type="button" class="button-normal button-exit" @click="onExit">
					退室
				</button>
			</router-link>
		</div>
		<div class="message-area">
			<div class="mt-5" v-if="filteredChatList.length !== 0">
				<div
					class="item mt-4 p-2"
					v-for="chat in is_sort_reverse
						? filteredChatList.slice().reverse()
						: filteredChatList"
					:key="chat.id"
					:class="[
						chat.isPinned ? 'important-frame' : 'frame',
						getChatClass(chat),
					]"
				>
					<div v-if="chat.userName === userName" class="menu-container">
						<button
							class="three-dot-leader"
							type="button"
							@click="
								isMenuInOpen = !isMenuInOpen;
								currentChat = chat.uid;
							"
						>
							<span class="dot"></span>
						</button>
						<div
							v-if="isMenuInOpen && currentChat === chat.uid"
							class="mini-menu"
						>
							<button @click="startEditing(chat)" class="button-normal">
								編集
							</button>
							<button
								@click="onDelete(chat.uid, chat.userName)"
								class="button-normal"
							>
								削除
							</button>
							<v-switch
								hide-details="auto"
								label="重要"
								class="pin_font"
								v-model="chat.isPinned"
								color="#7CB5BE"
								@click="() => console.log('重要なメッセージに設定しました')"
							></v-switch>
						</div>
					</div>

					<div class="message-header">
						<strong>
							<template v-if="chat.dataType === 'message'"
								>{{ chat.userName }} さん</template
							>
							<template
								v-else-if="
									chat.dataType === 'enter' || chat.dataType === 'exit'
								"
								>⚙️システム</template
							>
							<template v-else>📝メモ</template>
						</strong>
						<small class="util-ml-8px">{{ chat.publishTime }}</small>
					</div>

					<div class="message-content">
						{{ chat.context }}
					</div>
					<div
						v-if="isEditing && editingChat?.uid === chat.uid"
						class="edit-area"
					>
						<textarea
							v-model="editingChat.context"
							placeholder="編集内容を入力"
							rows="2"
							class="area"
						></textarea>
						<div class="bottun-wrapper">
							<button @click="finishEditing" class="mb-1 ml-3 button-normal">
								更新
							</button>
							<button @click="cancelEditing" class="mt-1 ml-3 button-normal">
								キャンセル
							</button>
						</div>
					</div>
				</div>
			</div>
			<div ref="bottomMarker"></div>
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
				<v-switch
					hide-details="auto"
					label="重要"
					class="pin_font"
					v-model="is_pin"
					color="#7CB5BE"
				></v-switch>
			</div>
		</div>
	</div>
</template>

<style scoped>
.pin_font {
	color: #000000;
	font-weight: bold;
}
.header {
	display: flex;
	justify-content: space-between;
	width: 100%;
	position: fixed;
	top: 0;
	left: 0;
	background-color: #ff9a07;
	z-index: 999; /* ヘッダーを前面に表示 */
}
@media screen and (min-width: 500px) {
	.header {
		height: 50px;
	}
	.filter-wrapper {
		margin-right: 80px;
	}
	.link {
		top: 9px;
		right: 0;
	}
	.scroll-down {
		width: 60px;
		height: 60px;
		bottom: 160px;
		right: 25px;
		font-size: large;
	}
}
@media screen and (max-width: 500px) {
	.header {
		flex-direction: column;
		height: 80px;
	}
	.filter-wrapper {
		justify-content: center;
	}
	.link {
		top: 4px;
		right: 0;
	}
	.scroll-down {
		width: 33px;
		height: 30px;
		bottom: 160px;
		right: 5px;
	}
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
	width: 100%;
}

.bottun-wrapper {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	margin-left: 4px;
}

.link {
	text-decoration: none;
	position: fixed;
}

.area {
	width: 70%;
	border: 1px solid #000;
	background-color: #ffffff;
	padding: 8px;
	margin-right: 4px;
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
	word-wrap: break-word; /* 長い単語を強制的に折り返す */
	word-break: break-all; /* 日本語や英語の長い文字列を折り返す */
	overflow-wrap: break-word; /* 現代的な折り返し指定 */
	max-width: 100%; /* 親要素の幅を超えないようにする */
	box-sizing: border-box; /* padding, borderを含めた幅計算 */
	padding: 8px; /* 内側の余白 */
	position: relative; /* ドットの位置を相対的にするため */
	margin-bottom: 10px;
}

.important-frame {
	border: #7cb5be solid 4px;
}

.frame {
	border: #000 solid 1px;
}

.my-bgcolor {
	background-color: #d9e9e8;
}

.other-bgcolor {
	background-color: #fff;
}
.memo-bgcolor {
	background-color: #d5d5d5;
}
.system-bgcolor {
	background-color: #fbe8d6;
}

.util-ml-8px {
	margin-left: 8px;
}

.button-exit {
	color: #000;
	margin: 0 4px;
}

.message-header {
	margin-bottom: 8px;
}

.message-content {
	margin-top: 4px;
}

.three-dot-leader {
	cursor: pointer;
	border: none;
	background: none;
	position: absolute; /* 絶対位置指定 */
	top: 8px; /* 上から8px */
	right: 8px; /* 右から8px */
	width: 20px;
	height: 20px;
	padding: 0;
	/* z-index: 1;  */
}

.three-dot-leader .dot,
.three-dot-leader .dot::before,
.three-dot-leader .dot::after {
	display: block;
	position: absolute;
	border-radius: 50%;
	width: 3px; /* ドットを少し大きく */
	height: 3px;
	background-color: #666;
}

.three-dot-leader .dot {
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.three-dot-leader .dot::before,
.three-dot-leader .dot::after {
	content: "";
}

.three-dot-leader .dot::before {
	/* 上側ドットの位置 */
	top: -6px;
}

.three-dot-leader .dot::after {
	/* 下側ドットの位置 */
	top: 6px;
}

.menu-container {
	top: 100%; /* ボタンのすぐ下に表示 */
	right: 0; /* 右端に配置 */
	z-index: 2;
}

.mini-menu {
	position: absolute;
	top: -10px;
	right: -110px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background-color: white;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	padding: 8px;
	list-style: none;
	margin-top: 4px;
	display: flex;
	flex-direction: column;
}

.scroll-down {
	display: flex;
	justify-content: center;
	align-items: center;
	position: fixed;
	background-color: #d9e9e8;
	border: 1px solid #000;
	cursor: pointer;
}
.scroll-down:hover {
	background-color: #7cb5be;
	box-shadow: 3px 3px 3px #707070;
}
</style>

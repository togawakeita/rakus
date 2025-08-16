<script setup>
import { inject, ref, reactive, onMounted } from "vue"
import socketManager from '../socketManager.js'

// #region global state
const userName = inject("userName")
// #endregion

// #region local variable
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const chatContent = ref("")
const chatList = reactive([])
// #endregion

// #region lifecycle
onMounted(() => {
  registerSocketEvent()
})
// #endregion

// #region browser event handler
// 投稿メッセージをサーバに送信する
const onPublish = () => {
  if (!chatContent.value.trim()) {
    alert("投稿内容を入力してください。")
    return
  }

  // 投稿メッセージを送信
  socket.emit("publishEvent", { userName: userName.value, content: chatContent.value })

  // 入力欄を初期化
  chatContent.value = ""
}

// 退室メッセージをサーバに送信する
// const onExit = () => {
//   // 退室メッセージを送信
//   socket.emit("exitEvent", { userName: userName.value })

//   // 入力欄を初期化
//   chatContent.value = ""

//   // チャット画面から退室する
//   chatList.unshift({ type: 'exit', userName: userName.value, content: `${userName.value}さんが退室しました。` })
// }

// メモを画面上に表示する
// const onMemo = () => {
//   if (!chatContent.value) {
//     alert("メモの内容を入力してください。")
//     return
//   }
//   // メモの内容を表示
//   chatList.unshift({ type: 'memo', userName: userName.value, content: chatContent.value })

//   // 入力欄を初期化
//   chatContent.value = ""
// }
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ画面上に表示する
// const onReceiveEnter = (data) => {
//   chatList.unshift({ type: 'enter', userName: data, content: `${data}さんが入室しました。` });
// }

// サーバから受信した退室メッセージを受け取り画面上に表示する
// const onReceiveExit = (data) => {
//   chatList.unshift({ type: 'exit', userName: data.userName, content: `${data.userName}さんが退室しました。` })
// }

// サーバから受信した投稿メッセージを画面上に表示する
const onReceivePublish = (data) => {
  chatList.unshift({ type: 'message', userName: data.userName, content: data.content })
}
// #endregion

// #region local methods
// イベント登録をまとめる
const registerSocketEvent = () => {
  // 入室イベントを受け取ったら実行
  // socket.on("enterEvent", (data) => {
  //   onReceiveEnter(data)
  // })

  // 退室イベントを受け取ったら実行
  // socket.on("exitEvent", (data) => {
  //   onReceiveExit(data)
  // })

  // 投稿イベントを受け取ったら実行
  socket.on("publishEvent", (data) => {
    onReceivePublish(data)
  })
}
// #endregion


//サイドバーように追加
const rooms = ref([])       // 作成されたルームの名前を格納
let roomCount = 0           // カウントでルーム名生成

const createRoom = () => {
  roomCount++
  rooms.value.push(`${roomCount}`)
}
</script>

<template>
  <div class="mx-auto my-5 px-4">
    <h1 class="text-h3 font-weight-medium">Vue.js Chat チャットルーム</h1>
    <div class="mt-10">
      <router-link to="/" class="link">
        <v-btn @click="onExit">退室する</v-btn>
      </router-link>
      <p>ログインユーザ：{{ userName }}さん</p>

      <div class="chat-area mt-5" v-if="chatList.length !== 0">
        <div v-for="(chat, i) in chatList" :key="i" class="chat-item">
          <div v-if="chat.type === 'message'" class="message-container">
            <div class="message-bubble" :class="{ 'my-message': chat.userName === userName }">
              <div class="message-header">{{ chat.userName }}</div>
              <div class="message-content">{{ chat.content }}</div>
            </div>
          </div>
          
          <!-- メモ -->
          <!-- <div v-else-if="chat.type === 'memo'" class="memo-container">
            <div class="memo-box">
              <v-icon class="memo-icon" color="amber">mdi-note-text</v-icon>
              <div class="memo-header">{{ chat.userName }}さんのメモ</div>
              <div class="memo-content">{{ chat.content }}</div>
            </div>
          </div> -->
          
          <!-- 入室・退室通知 -->
          <!-- <div v-else>
            <v-container class="notification-container pa-0">
              <v-row dense>
                <v-col cols="12">
                  <div class="notification" :class="chat.type === 'enter' ? 'enter-notification' : 'exit-notification'">
                    <v-icon class="notification-icon" :color="chat.type === 'enter' ? 'success' : 'error'">
                      {{ chat.type === 'enter' ? 'mdi-login' : 'mdi-logout' }}
                    </v-icon>
                    <span>{{ chat.content }}</span>
                  </div>
                </v-col>
              </v-row>
            </v-container>
          </div> -->
        </div>
      </div>

      <v-container class="pa-0">
        <v-row dense>
          <v-col cols="12">
            <textarea variant="outlined" placeholder="投稿文を入力してください" rows="3" class="area" v-model="chatContent" style="width: 100%; box-sizing: border-box;"></textarea>
          </v-col>
          <v-col cols="12">
            <!-- <button class="button-normal" @click="onPublish">投稿</button> -->
            <v-btn block color="blue-darken-4" style="color: white;" @click="onPublish">投稿</v-btn>
          </v-col>
          <!-- <v-col cols="12"> -->
            <!-- <button class="button-normal util-ml-8px" @click="onMemo">メモ</button> -->
            <!-- <v-btn block @click="onMemo">メモ</v-btn> -->
          <!-- </v-col> -->
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<style scoped>
.link {
  text-decoration: none;
}

.area {
  width: 500px;
  border: 1px solid #000;
  margin-top: 8px;
}

.item {
  display: block;
}

.util-ml-8px {
  margin-left: 8px;
}

.button-exit {
  color: #fff;
  margin-top: 8px;
}

.chat-item {
  margin-bottom: 10px;
}

/* 投稿メッセージ（吹き出し）のスタイル */
.message-container {
  display: flex;
  width: 100%;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background-color: #333;
  position: relative;
  margin-left: 0;
}

.message-bubble.my-message {
  background-color: #0046A2;
  margin-left: auto;
  margin-right: 0;
}

.message-bubble::before {
  content: '';
  position: absolute;
  top: 30px;
  left: -8px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid #333;
}

.message-bubble.my-message::before {
  left: auto;
  right: -8px;
  border-right: none;
  border-left: 8px solid #0046A2;
}

.message-header {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 4px;
}

.message-content {
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  color: white;
}

/* メモのスタイル */
/* .memo-container {
  display: flex;
  justify-content: center;
}

.memo-box {
  background-color: #fff8e1;
  border: 2px dashed #ffb74d;
  border-radius: 8px;
  padding: 16px;
  max-width: 80%;
  position: relative;
}

.memo-icon {
  position: absolute;
  top: 8px;
  right: 8px;
}

.memo-header {
  font-size: 12px;
  font-weight: bold;
  color: #f57c00;
  margin-bottom: 8px;
}

.memo-content {
  font-size: 14px;
  line-height: 1.4;
  color: #333;
} */

/* 通知のスタイル */
/* .notification-container {
  width: 100%;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
  width: 100%;
}

.enter-notification {
  background-color: #e8f5e8;
  border: 1px solid #4caf50;
}

.exit-notification {
  background-color: #ffebee;
  border: 1px solid #f44336;
}

.notification-icon {
  margin-right: 8px;
  font-size: 16px;
} */

/* スクロールバーのスタイル調整 */
.chat-area::-webkit-scrollbar {
  width: 6px;
}

.chat-area::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-area::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-area::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
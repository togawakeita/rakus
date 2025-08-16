<script setup>
import { inject, ref } from "vue"
import { useRouter } from "vue-router"
import socketManager from '../socketManager.js'

// #region global state
const userName = inject("userName")
// #endregion

// #region local variable
const router = useRouter()
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const inputUserName = ref("")
// #endregion

// #region browser event handler
// 入室メッセージをクライアントに送信する
const onEnter = () => {
  // ユーザー名が入力されているかチェック

  if (!inputUserName.value.trim()) {
    alert('入力が空です。値を入力してください。')
    return
  }

  // 入室メッセージを送信
  socket.emit("enterEvent", inputUserName.value)

  // 全体で使用するnameに入力されたユーザー名を格納
  userName.value = inputUserName.value
  // チャット画面へ遷移
  // router.push({ name: "chat" })
  router.push({ name: "chat-with-sidebar" })
}
// #endregion
</script>

<template>
  <div class="page-background">
  <div class="mx-auto my-5 px-4 center-container">

    <img src="/public/soccer-ball.png" alt="Vamos Logo" class="ball-logo" />
    <h1 class="vamos-title font-weight-medium">Vamos!</h1>
    <div class="mt-10">
      <!-- 画像挿入 -->
      <v-text-field
        v-model="inputUserName"
        label="ユーザーネームを入力してください"
        prepend-inner-icon="mdi-account"
        outlined
        dense
        hide-details
        class="login-input"
      />
    </div>
    <v-btn
        class="login-button"
        color="white"
        @click="onEnter"
        block
        elevation="2"
      >
        <span class="login-text">ログイン</span>
      </v-btn>
  </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Mrs+Sheppards&display=swap');
</style>

<style>
html, body {
  margin: 0;
  height: 100%;
  overflow: hidden;
}
#app {
  height: 100%;
}
</style>


<style scoped>
.vamos-title {
  position: relative;
  z-index: 2;
  color: white;
  font-family: "Mrs Sheppards", cursive;
  font-size: 8rem; /* このサイズが適用されるはず */
  text-align: center;
}
.page-background {
  background: #0046A2;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.user-name-text {
  width: 200px;
  border: 1px solid #888;
  margin-bottom: 16px;
}

.center-container {
  position: relative;
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ball-logo {
  width: 60px;
  height: 60px;
  display: block;
  position: absolute;
  z-index: 5;
  top: 83px;
  left: 227px;
}

.login-input {
  background-color: transparent;
  color: white;
}

.button-normal {
  color: #fff;
}
</style>
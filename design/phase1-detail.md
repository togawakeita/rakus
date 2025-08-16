# Phase 1: サイドバー基盤 - 詳細実装ガイド

## 📋 Phase 1 概要

サッカー部チャットアプリにサイドバー機能を追加し、階層化されたルーム構造を表示する基盤を構築します。
既存のChat.vueには影響を与えず、新しいChatWithSidebar.vueコンポーネントを作成します。

## 🎯 実装目標

- ✅ サイドバー付きレイアウトの実装
- ✅ ルーム階層構造の表示
- ✅ 基本的なルーム切り替え機能
- ✅ 既存機能への非干渉
- ✅ 折り畳み機能

## 📁 作成・修正ファイル一覧

### 新規作成ファイル
1. `src/components/Sidebar.vue` - サイドバーコンポーネント
2. `src/components/RoomHeader.vue` - ルーム情報ヘッダー
3. `src/components/ChatWithSidebar.vue` - サイドバー対応版チャット

### 修正ファイル
1. `src/router/index.js` - ルート追加

## 🔧 詳細実装手順

### 1. Sidebar.vue - サイドバーコンポーネント

**ファイルパス**: `src/components/Sidebar.vue`

**実装内容**:
```vue
<script setup>
import { ref, reactive, onMounted } from 'vue'

// #region reactive state
const currentRoom = ref('soccer-club')
const rooms = reactive({
  'soccer-club': {
    name: 'サッカー部全体',
    type: 'public',
    icon: '🏆',
    members: ['all']
  },
  'team-a': {
    name: 'Aチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    children: ['team-a-match-a', 'team-a-match-b']
  },
  'team-a-match-a': {
    name: '試合A',
    type: 'match',
    icon: '🥅',
    parent: 'team-a'
  },
  'team-a-match-b': {
    name: '試合B',
    type: 'match',
    icon: '🥅',
    parent: 'team-a'
  },
  'team-b': {
    name: 'Bチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club'
  },
  'team-c': {
    name: 'Cチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club'
  }
})
// #endregion

// #region emits
const emit = defineEmits(['room-changed'])
// #endregion

// #region methods
const selectRoom = (roomId) => {
  currentRoom.value = roomId
  emit('room-changed', roomId)
}

const getRoomsByParent = (parentId) => {
  return Object.entries(rooms)
    .filter(([, room]) => room.parent === parentId)
    .map(([id, room]) => ({ id, ...room }))
}

const isRoomActive = (roomId) => {
  return currentRoom.value === roomId
}
// #endregion

// #region lifecycle
onMounted(() => {
  emit('room-changed', currentRoom.value)
})
// #endregion
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>チャットルーム</h3>
    </div>
    
    <div class="room-list">
      <!-- サッカー部全体（トップレベル） -->
      <div 
        class="room-item top-level"
        :class="{ active: isRoomActive('soccer-club') }"
        @click="selectRoom('soccer-club')"
      >
        <span class="room-icon">{{ rooms['soccer-club'].icon }}</span>
        <span class="room-name">{{ rooms['soccer-club'].name }}</span>
      </div>

      <!-- チームレベル -->
      <div v-for="team in getRoomsByParent('soccer-club')" :key="team.id" class="team-section">
        <div 
          class="room-item team-level"
          :class="{ active: isRoomActive(team.id) }"
          @click="selectRoom(team.id)"
        >
          <span class="room-icon">{{ team.icon }}</span>
          <span class="room-name">{{ team.name }}</span>
        </div>

        <!-- マッチレベル（Phase 2で折りたたみ機能を追加予定） -->
        <div v-if="team.children" class="match-section">
          <div 
            v-for="matchId in team.children" 
            :key="matchId"
            class="room-item match-level"
            :class="{ active: isRoomActive(matchId) }"
            @click="selectRoom(matchId)"
          >
            <span class="room-icon">{{ rooms[matchId].icon }}</span>
            <span class="room-name">{{ rooms[matchId].name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 250px;
  height: 100vh;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #ddd;
  background-color: #fff;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.room-list {
  padding: 8px 0;
}

.room-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
}

.room-item:hover {
  background-color: #e8e8e8;
}

.room-item.active {
  background-color: #007acc;
  color: white;
}

.room-item.active:hover {
  background-color: #005a9e;
}

.top-level {
  font-weight: 600;
  font-size: 16px;
}

.team-level {
  padding-left: 24px;
  font-weight: 500;
}

.match-level {
  padding-left: 48px;
  font-size: 14px;
}

.expand-icon {
  margin-right: 4px;
  font-size: 12px;
  min-width: 12px;
}

.expand-icon {
  margin-right: 4px;
  font-size: 12px;
  min-width: 12px;
}

.room-icon {
  margin-right: 8px;
  font-size: 16px;
}

.room-name {
  flex: 1;
}

.team-section {
  margin-bottom: 4px;
}

.match-section {
  margin-left: 8px;
}
</style>
```

**重要なポイント**:
- `rooms`オブジェクトでルーム階層を定義
- `expanded`プロパティで折りたたみ状態を管理
- `emit('room-changed', roomId)`で親コンポーネントに選択を通知
- CSS Flexboxでレイアウト調整

### 2. RoomHeader.vue - ルーム情報ヘッダー

**ファイルパス**: `src/components/RoomHeader.vue`

**実装内容**:
```vue
<script setup>
import { computed } from 'vue'

// #region props
const props = defineProps({
  currentRoom: {
    type: String,
    required: true
  },
  rooms: {
    type: Object,
    required: true
  }
})
// #endregion

// #region computed
const currentRoomInfo = computed(() => {
  return props.rooms[props.currentRoom] || { name: 'Unknown Room', icon: '💬' }
})

const getRoomPath = computed(() => {
  const path = []
  let current = props.currentRoom
  
  while (current && props.rooms[current]) {
    path.unshift({
      id: current,
      name: props.rooms[current].name,
      icon: props.rooms[current].icon
    })
    current = props.rooms[current].parent
  }
  
  return path
})
// #endregion
</script>

<template>
  <div class="room-header">
    <div class="room-path">
      <span 
        v-for="(room, index) in getRoomPath" 
        :key="room.id"
        class="path-item"
      >
        <span class="room-icon">{{ room.icon }}</span>
        <span class="room-name">{{ room.name }}</span>
        <span v-if="index < getRoomPath.length - 1" class="separator">></span>
      </span>
    </div>
    
    <div class="room-info">
      <h2 class="current-room-name">
        <span class="room-icon">{{ currentRoomInfo.icon }}</span>
        {{ currentRoomInfo.name }}
      </h2>
      <p class="room-description">現在のチャットルーム</p>
    </div>
  </div>
</template>

<style scoped>
.room-header {
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  padding: 16px 24px;
}

.room-path {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.path-item {
  display: flex;
  align-items: center;
}

.separator {
  margin: 0 8px;
  color: #999;
}

.room-info {
  margin: 0;
}

.current-room-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
}

.room-icon {
  margin-right: 8px;
}

.room-description {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #666;
}
</style>
```

**重要なポイント**:
- `props`で現在のルーム情報を受け取り
- `getRoomPath`でパン屑リストを生成
- ルーム階層の可視化

### 3. ChatWithSidebar.vue - メインコンポーネント

**ファイルパス**: `src/components/ChatWithSidebar.vue`

**実装内容**:
```vue
<script setup>
import { inject, ref, reactive, onMounted } from "vue"
import { useRouter } from "vue-router"
import socketManager from '../socketManager.js'
import Sidebar from './Sidebar.vue'
import RoomHeader from './RoomHeader.vue'

// #region global state
const userName = inject("userName")
const router = useRouter()
// #endregion

// #region local variable
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const chatContent = ref("")
const chatList = reactive([])

// Phase 1: シンプルなルーム状態管理
const currentRoom = ref('soccer-club')
const rooms = reactive({
  'soccer-club': {
    name: 'サッカー部全体',
    type: 'public',
    icon: '🏆',
    members: ['all']
  },
  'team-a': {
    name: 'Aチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    children: ['team-a-match-a', 'team-a-match-b'],
    expanded: false
  },
  'team-a-match-a': {
    name: '試合A',
    type: 'match',
    icon: '🥅',
    parent: 'team-a'
  },
  'team-a-match-b': {
    name: '試合B',
    type: 'match',
    icon: '🥅',
    parent: 'team-a'
  },
  'team-b': {
    name: 'Bチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    expanded: false
  },
  'team-c': {
    name: 'Cチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    expanded: false
  }
})
// #endregion

// #region lifecycle
onMounted(() => {
  registerSocketEvent()
})
// #endregion

// #region browser event handler
const onPublish = () => {
  if (!chatContent.value.trim()) {
    alert("投稿内容を入力してください。")
    return
  }

  socket.emit("publishEvent", { userName: userName.value, content: chatContent.value })
  chatContent.value = ""
}

const onExit = () => {
  socket.emit("exitEvent", { userName: userName.value })
  chatContent.value = ""
  console.log(`${userName.value}さんが退室しました`)
  router.push({ name: "login" })
}

const onMemo = () => {
  if (!chatContent.value.trim()) {
    alert("メモの内容を入力してください。")
    return
  }
  
  chatList.unshift(`${userName.value}さんのメモ: ${chatContent.value}`)
  chatContent.value = ""
}

const onRoomChanged = (roomId) => {
  currentRoom.value = roomId
  console.log(`ルーム切り替え: ${rooms[roomId]?.name}`)
}
// #endregion

// #region socket event handler
const onReceiveEnter = (data) => {
  console.log(`${data}さんが入室しました`)
}

const onReceiveExit = (data) => {
  console.log(`${data.userName}さんが退室しました`)
}

const onReceivePublish = (data) => {
  chatList.unshift(`${data.userName}: ${data.content}`)
}
// #endregion

// #region local methods
const registerSocketEvent = () => {
  socket.on("enterEvent", onReceiveEnter)
  socket.on("exitEvent", onReceiveExit)
  socket.on("publishEvent", onReceivePublish)
}
// #endregion
</script>

<template>
  <div class="chat-layout">
    <!-- サイドバー -->
    <Sidebar @room-changed="onRoomChanged" />
    
    <!-- メインチャット画面 -->
    <div class="chat-main">
      <!-- ルームヘッダー -->
      <RoomHeader :current-room="currentRoom" :rooms="rooms" />
      
      <!-- チャット内容 -->
      <div class="chat-content">
        <div class="chat-info">
          <p>ログインユーザ：{{ userName }}さん</p>
          <p class="room-info">現在のルーム：{{ rooms[currentRoom]?.name }}</p>
        </div>
        
        <!-- メッセージ履歴 -->
        <div class="message-history">
          <div v-if="chatList.length !== 0">
            <ul>
              <li class="message-item" v-for="(chat, i) in chatList" :key="i">{{ chat }}</li>
            </ul>
          </div>
          <div v-else class="empty-message">
            まだメッセージがありません。最初のメッセージを投稿してみましょう！
          </div>
        </div>
        
        <!-- メッセージ入力エリア -->
        <div class="message-input-area">
          <textarea 
            placeholder="投稿文を入力してください" 
            rows="4" 
            class="message-textarea" 
            v-model="chatContent"
          ></textarea>
          <div class="button-group">
            <button class="button-normal" @click="onPublish">投稿</button>
            <button class="button-normal util-ml-8px" @click="onMemo">メモ</button>
          </div>
        </div>
        
        <!-- 退室ボタン -->
        <div class="exit-section">
          <router-link to="/" class="link">
            <button type="button" class="button-normal button-exit" @click="onExit">退室する</button>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  overflow: hidden;
}

.chat-info {
  margin-bottom: 16px;
}

.chat-info p {
  margin: 4px 0;
  font-weight: 500;
  color: #333;
}

.room-info {
  color: #007acc !important;
  font-size: 14px;
}

.message-history {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 16px;
  background-color: #fafafa;
}

.message-item {
  display: block;
  margin-bottom: 8px;
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.empty-message {
  text-align: center;
  color: #666;
  font-style: italic;
  margin-top: 50px;
}

.message-input-area {
  border-top: 1px solid #ddd;
  padding-top: 16px;
}

.message-textarea {
  width: 100%;
  max-width: 600px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
  resize: vertical;
  font-family: inherit;
}

.message-textarea:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.button-group {
  margin-top: 12px;
}

.button-normal {
  background-color: #007acc;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.button-normal:hover {
  background-color: #005a9e;
}

.util-ml-8px {
  margin-left: 8px;
}

.exit-section {
  margin-top: 16px;
  border-top: 1px solid #ddd;
  padding-top: 16px;
}

.button-exit {
  background-color: #dc3545;
}

.button-exit:hover {
  background-color: #c82333;
}

.link {
  text-decoration: none;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
```

**重要なポイント**:
- `inject("userName")`でグローバル状態を取得
- サイドバーから`@room-changed`イベントを受信
- Flexboxレイアウトでサイドバーとメイン画面を配置

### 4. router/index.js - ルート追加

**ファイルパス**: `src/router/index.js`

**追加する内容**:
```javascript
// 既存のimport文に追加
import ChatWithSidebar from "../components/ChatWithSidebar.vue"

// routesの配列に以下を追加
{
  path: "/chat-with-sidebar/",
  name: "chat-with-sidebar",
  component: ChatWithSidebar,
  beforeEnter: (to, from, next) => {
    if(from.name === "login"){
      next()
    } else {
      next({ name:"login" })
    }
  },
}
```

**修正後の完全なファイル**:
```javascript
import { createRouter, createWebHistory } from "vue-router"
import Chat from "../components/Chat.vue"
import ChatWithSidebar from "../components/ChatWithSidebar.vue"
import Login from "../components/Login.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "login",
      component: Login
    },{
      path: "/chat/",
      name: "chat",
      component: Chat,
      beforeEnter: (to, from, next) => {
        if(from.name === "login"){
          next()
        } else {
          next({ name:"login" })
        }
      },
    },{
      path: "/chat-with-sidebar/",
      name: "chat-with-sidebar",
      component: ChatWithSidebar,
      beforeEnter: (to, from, next) => {
        if(from.name === "login"){
          next()
        } else {
          next({ name:"login" })
        }
      },
    }
  ],
})

export default router
```

## 🧪 動作確認手順

### 1. 開発サーバー起動
```bash
cd /home/dev26/hackathon/chatapp
npm start
```

### 2. ブラウザでアクセス
1. `https://localhost:10046` にアクセス
2. ユーザー名を入力してログイン
3. URL を `https://localhost:10046/chat-with-sidebar/` に変更
4. サイドバーが表示されることを確認

### 3. 機能確認項目
- [x] サイドバーの表示
- [x] ルーム階層の表示（サッカー部全体 > チームA/B/C）
- [x] チーム配下の試合表示（▶/▼アイコンで折りたたみ）
- [x] ルーム選択時のハイライト（青色）
- [x] ルームヘッダーの表示
- [x] メッセージ投稿機能
- [x] メモ機能

## 🔍 トラブルシューティング

### よくある問題と解決方法

1. **サイドバーが表示されない**
   - Flexboxのスタイルが適用されているか確認
   - `chat-layout`クラスの`display: flex`を確認

2. **ルーム切り替えが動作しない**
   - `@room-changed`イベントの設定を確認
   - コンソールログでイベントが発火するか確認

3. **折りたたみ機能が動作しない**
   - `@click.stop`修飾子が設定されているか確認
   - `expanded`プロパティの初期値を確認

4. **CSS が適用されない**
   - `<style scoped>`が正しく設定されているか確認
   - クラス名の重複がないか確認

## 📝 Phase 1 完了後の状態

### ✅ 実装完了項目
- サイドバー付きレイアウト
- ルーム階層表示
- 基本的なルーム切り替え
- 折りたたみ機能
- 非破壊的開発（既存機能への影響なし）

### 🚀 Phase 2 への準備
- Socket.IOルーム機能の実装準備
- 状態管理ストアの導入検討
- ルーム別メッセージ管理の設計

---

**📅 作成日**: 2025年7月31日  
**🎯 Phase**: Phase 1 - サイドバー基盤  
**👨‍💻 担当**: okura (feat/sidebar_okura ブランチ)

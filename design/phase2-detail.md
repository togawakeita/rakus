# Phase 2: ルーム機能実装 - 詳細実装ガイド

## 📋 Phase 2 概要

### 🎯 実装目標
- Socket.IOを活用したリアルタイムルーム機能
- ルーム別メッセージ管理システム
- ユーザーがルームを切り替えた際の適切な接続処理

### 🚀 Phase 1からの変更点
- Phase 1: 基本的なUIとルーム切り替え表示
- Phase 2: 実際のSocket.IOルーム機能とメッセージ分離

## 🔧 実装詳細

### 1. サーバーサイド実装 - Socket.IOイベント拡張

**ファイルパス**: `socket_event/index.js`

**実装内容**:
```javascript
const io = require('socket.io')()

// ルーム管理用のマップ
const roomUsers = new Map() // roomId -> Set(userIds)
const userRooms = new Map() // userId -> roomId

io.on('connection', (socket) => {
  console.log('ユーザーが接続しました:', socket.id)

  // 既存イベント
  socket.on('enterEvent', (data) => {
    console.log(`${data}さんが入室しました。`)
    socket.broadcast.emit('enterEvent', data)
  })

  socket.on('exitEvent', (data) => {
    console.log(`${data.userName}さんが退室しました。`)
    
    // ユーザーが所属していたルームから退出
    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      leaveRoom(socket, currentRoom, data.userName)
    }
    
    socket.broadcast.emit('exitEvent', data)
  })

  socket.on('publishEvent', (data) => {
    console.log(`${data.userName}: ${data.content}`)
    
    // 現在のルームにのみメッセージを送信
    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      // ルーム内の全員にメッセージを送信
      socket.to(currentRoom).emit('publishEvent', {
        ...data,
        roomId: currentRoom,
        timestamp: new Date().toISOString()
      })
      
      // 送信者にも確認メッセージを送信
      socket.emit('publishEvent', {
        ...data,
        roomId: currentRoom,
        timestamp: new Date().toISOString()
      })
    }
  })

  // 新規: ルーム参加イベント
  socket.on('joinRoom', (data) => {
    const { roomId, userName } = data
    
    // 前のルームから退出
    const previousRoom = userRooms.get(socket.id)
    if (previousRoom && previousRoom !== roomId) {
      leaveRoom(socket, previousRoom, userName)
    }
    
    // 新しいルームに参加
    joinRoom(socket, roomId, userName)
  })

  // 新規: ルーム退出イベント
  socket.on('leaveRoom', (data) => {
    const { roomId, userName } = data
    leaveRoom(socket, roomId, userName)
  })

  // 接続終了時の処理
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました:', socket.id)
    
    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      leaveRoom(socket, currentRoom, 'Unknown User')
    }
  })
})

// ルーム参加処理
function joinRoom(socket, roomId, userName) {
  socket.join(roomId)
  
  // ルーム管理マップを更新
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Set())
  }
  roomUsers.get(roomId).add(socket.id)
  userRooms.set(socket.id, roomId)
  
  console.log(`${userName}さんが${roomId}ルームに参加しました`)
  
  // ルーム内の他のユーザーに通知
  socket.to(roomId).emit('userJoinedRoom', {
    userName,
    roomId,
    message: `${userName}さんが${roomId}ルームに参加しました`
  })
  
  // 参加確認を本人に送信
  socket.emit('joinedRoom', {
    roomId,
    message: `${roomId}ルームに参加しました`,
    memberCount: roomUsers.get(roomId).size
  })
}

// ルーム退出処理
function leaveRoom(socket, roomId, userName) {
  socket.leave(roomId)
  
  // ルーム管理マップを更新
  if (roomUsers.has(roomId)) {
    roomUsers.get(roomId).delete(socket.id)
    if (roomUsers.get(roomId).size === 0) {
      roomUsers.delete(roomId)
    }
  }
  userRooms.delete(socket.id)
  
  console.log(`${userName}さんが${roomId}ルームから退出しました`)
  
  // ルーム内の他のユーザーに通知
  socket.to(roomId).emit('userLeftRoom', {
    userName,
    roomId,
    message: `${userName}さんが${roomId}ルームから退出しました`
  })
}

module.exports = io
```

### 2. クライアントサイド実装 - ChatWithSidebar.vue 拡張

**ファイルパス**: `src/components/ChatWithSidebar.vue`

**Phase 2での追加・変更箇所**:

```vue
<script setup>
import { inject, ref, reactive, onMounted, watch, nextTick } from "vue"
import socketManager from '../socketManager.js'
import { useRouter } from "vue-router"
import Sidebar from "./Sidebar.vue"

// #region global state
const userName = inject("userName")
const router = useRouter()
// #endregion

// #region local variable
const socket = socketManager.getInstance()
// #endregion

// #region reactive variable
const chatContent = ref("")
// Phase 2: ルーム別メッセージ管理
const roomMessages = reactive(new Map()) // roomId -> messages[]
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
    expanded: true
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

// 現在のルームのメッセージリスト（computed的に）
const currentRoomMessages = computed(() => {
  return roomMessages.get(currentRoom.value) || []
})
// #endregion

// #region lifecycle
onMounted(() => {
  // 各ルームのメッセージリストを初期化
  Object.keys(rooms).forEach(roomId => {
    roomMessages.set(roomId, [])
  })
  
  registerSocketEvent()
  
  // 初期ルームに参加
  joinRoom(currentRoom.value)
})

// ルーム変更を監視してSocket.IOルームを切り替え
watch(currentRoom, (newRoomId, oldRoomId) => {
  if (newRoomId !== oldRoomId) {
    switchRoom(oldRoomId, newRoomId)
  }
})
// #endregion

// #region browser event handler
// 投稿メッセージをサーバに送信する（ルーム対応版）
const onPublish = () => {
  if (!chatContent.value) {
    alert("投稿内容を入力してください。")
    return
  }

  // 現在のルームに投稿メッセージを送信
  socket.emit("publishEvent", { 
    userName: userName.value, 
    content: chatContent.value,
    roomId: currentRoom.value
  })

  // 入力欄を初期化
  chatContent.value = ""
}

// 退室メッセージをサーバに送信する
const onExit = () => {
  // 現在のルームから退出
  if (currentRoom.value) {
    socket.emit("leaveRoom", { 
      roomId: currentRoom.value, 
      userName: userName.value 
    })
  }

  // 退室メッセージを送信
  socket.emit("exitEvent", { userName: userName.value })

  // 入力欄を初期化
  chatContent.value = ""

  // チャット画面から退室する
  const messages = roomMessages.get(currentRoom.value) || []
  messages.unshift(`${userName.value}さんが退室しました。`)
  
  router.push({ name: 'login' })
}

// メモを画面上に表示する
const onMemo = () => {
  if (!chatContent.value) {
    alert("メモの内容を入力してください。")
    return
  }
  
  // 現在のルームのメッセージリストにメモを追加
  const messages = roomMessages.get(currentRoom.value) || []
  messages.unshift(`${userName.value}さんのメモ: ${chatContent.value}`)

  // 入力欄を初期化
  chatContent.value = ""
}

const onRoomChange = (roomId) => {
  currentRoom.value = roomId
  console.log(`ルーム切り替え: ${rooms[roomId]?.name}`)
}
// #endregion

// #region socket event handler
// サーバから受信した入室メッセージ画面上に表示する
const onReceiveEnter = (data) => {
  const messages = roomMessages.get(currentRoom.value) || []
  messages.unshift(`${data}さんが入室しました。`)
}

// サーバから受信した退室メッセージを受け取り画面上に表示する
const onReceiveExit = (data) => {
  const messages = roomMessages.get(currentRoom.value) || []
  messages.unshift(`${data.userName}さんが退室しました。`)
}

// サーバから受信した投稿メッセージを画面上に表示する（ルーム対応版）
const onReceivePublish = (data) => {
  const targetRoomId = data.roomId || currentRoom.value
  const messages = roomMessages.get(targetRoomId) || []
  messages.unshift(`${data.userName}: ${data.content}`)
}

// 新規: ルーム参加通知
const onUserJoinedRoom = (data) => {
  const messages = roomMessages.get(data.roomId) || []
  messages.unshift(data.message)
}

// 新規: ルーム退出通知
const onUserLeftRoom = (data) => {
  const messages = roomMessages.get(data.roomId) || []
  messages.unshift(data.message)
}

// 新規: ルーム参加確認
const onJoinedRoom = (data) => {
  console.log(`ルーム参加確認: ${data.roomId}`)
  const messages = roomMessages.get(data.roomId) || []
  messages.unshift(`${data.message} (メンバー数: ${data.memberCount})`)
}
// #endregion

// #region local methods
// Socket.IOルーム切り替え処理
const switchRoom = async (oldRoomId, newRoomId) => {
  // 前のルームから退出
  if (oldRoomId) {
    socket.emit("leaveRoom", { 
      roomId: oldRoomId, 
      userName: userName.value 
    })
  }
  
  // 新しいルームに参加
  await nextTick() // DOM更新を待つ
  joinRoom(newRoomId)
}

const joinRoom = (roomId) => {
  socket.emit("joinRoom", { 
    roomId: roomId, 
    userName: userName.value 
  })
}

// イベント登録をまとめる（Phase 2拡張版）
const registerSocketEvent = () => {
  // 既存イベント
  socket.on("enterEvent", onReceiveEnter)
  socket.on("exitEvent", onReceiveExit)
  socket.on("publishEvent", onReceivePublish)
  
  // 新規ルーム関連イベント
  socket.on("userJoinedRoom", onUserJoinedRoom)
  socket.on("userLeftRoom", onUserLeftRoom)
  socket.on("joinedRoom", onJoinedRoom)
}
// #endregion
</script>

<template>
  <div class="chat-with-sidebar">
    <Sidebar @room-changed="onRoomChange" />
    <div class="main-content">
      <div class="mx-auto my-5 px-4">
        <h1 class="text-h3 font-weight-medium">Vue.js Chat チャットルーム</h1>
        <div class="mt-10">
          <p>ログインユーザ：{{ userName }}さん</p>
          <p>現在のルーム：{{ rooms[currentRoom]?.name }} ({{ currentRoom }})</p>
          <textarea variant="outlined" placeholder="投稿文を入力してください" rows="4" class="area" v-model="chatContent"></textarea>
          <div class="mt-5">
            <button class="button-normal" @click="onPublish">投稿</button>
            <button class="button-normal util-ml-8px" @click="onMemo">メモ</button>
          </div>
          <div class="mt-5" v-if="currentRoomMessages.length !== 0">
            <h4>{{ rooms[currentRoom]?.name }} のメッセージ:</h4>
            <ul>
              <li class="item mt-4" v-for="(chat, i) in currentRoomMessages" :key="i">{{ chat }}</li>
            </ul>
          </div>
        </div>
        <router-link to="/" class="link">
          <button type="button" class="button-normal button-exit" @click="onExit">退室する</button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-with-sidebar {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

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
</style>
```

## 🔄 Phase 2での主要変更点

### 1. ルーム別メッセージ管理
- `roomMessages` Map でルームごとにメッセージを分離
- `currentRoomMessages` でアクティブなルームのメッセージのみ表示

### 2. Socket.IOルーム機能
- `joinRoom` / `leaveRoom` イベントで実際のルーム参加・退出
- `watch` を使用してルーム切り替え時の自動処理

### 3. リアルタイム通知
- ユーザーのルーム参加・退出通知
- ルーム限定メッセージ配信

### 4. サーバーサイド拡張
- ルーム管理用のマップでユーザー状態を追跡
- メッセージのルーム限定配信

## 🧪 動作確認手順

### 1. サーバー起動確認
```bash
cd /home/dev26/hackathon/chatapp
npm run dev
```

### 2. 複数ブラウザでテスト
1. ブラウザA: `https://localhost:10046/chat-with-sidebar/` でログイン
2. ブラウザB: 同じURLで別ユーザーとしてログイン
3. 異なるルームに移動してメッセージ投稿
4. ルーム別にメッセージが分離されることを確認

### 3. 確認項目
- [x] ルーム切り替え時の参加・退出通知
- [x] ルーム別メッセージの分離表示
- [x] 複数ユーザー間でのリアルタイム同期
- [x] サーバーログでのルーム状態確認

## 🚀 Phase 3への準備

Phase 2完了後は以下の機能を検討：
- 未読メッセージ数の表示
- アクティブユーザーリスト
- メッセージ検索機能

## 📝 実装時の注意点

### パフォーマンス
- `roomMessages` Map が大きくなりすぎないよう、メッセージ数制限を考慮
- 不要になったルームの自動クリーンアップ

### エラーハンドリング
- ルーム参加失敗時の復旧処理
- ネットワーク切断時の再接続処理

### デバッグ
- サーバーログでルーム状態を確認
- ブラウザ開発者ツールでSocket.IOイベントをモニタ

---

**📅 作成日**: 2025年7月31日  
**🔧 対象フェーズ**: Phase 2 ルーム機能実装  
**👨‍💻 担当**: okura (feat/sidebar_okura ブランチ)

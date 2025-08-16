<script setup>
import { inject, ref, reactive, onMounted, nextTick } from 'vue'
import socketManager from '../socketManager.js'

const currentRoom = inject("currentRoom")
const rooms = inject("rooms")
const userName = inject("userName")

// #region emits
// 親コンポーネントに渡すイベントを定義
const emit = defineEmits(['room-changed'])
// #endregion

// #region local variable
const socket = socketManager.getInstance()
// #endregion

socket.on("onNewRoom", (data) => {
  // rooms = data ではなく、プロパティごとに更新
  Object.keys(rooms).forEach(key => delete rooms[key])
  Object.entries(data).forEach(([key, value]) => {
    rooms[key] = value
  })
  console.log("Received new rooms:", rooms)
})

socket.on("fetchServerRooms", (data) => {
  // rooms = data ではなく、プロパティごとに更新
  Object.keys(rooms).forEach(key => delete rooms[key])
  Object.entries(data).forEach(([key, value]) => {
    rooms[key] = value
  })
  console.log("Fetched server rooms:", rooms)
})

// 状態
const isEditing = ref(false)
const newRoom = ref('')
const placeholderText = 'ルーム作成'

// refs
const inputRef = ref(null)

// 外部または親コンポーネントから受け取る rooms, appendRoom()

// 編集開始
function startEdit() {
  isEditing.value = true
  console.log('startEdit called') // 追加
  newRoom.value = ''
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 入力確定時
function handleConfirm() {
  const name = newRoom.value.trim()
  if (name) {
    // createNew_Room(name) // ← ここで使う！
    socket.emit("EmitNewRoom",{name:name})
  }
  isEditing.value = false
}

// 編集キャンセル（フォーカス外し）
function cancelEdit() {
  console.log('cancelEdit called') // 追加
  isEditing.value = false
}

// #region methods

// 一つだけプルダウン
const expandedTeamId = ref(null)

const selectRoom = (roomId) => {
  currentRoom.value = roomId
  emit('room-changed', roomId)
  if (rooms[roomId] && rooms[roomId].children) {
    rooms[roomId].expanded = !rooms[roomId].expanded
  }
  /*const team = rooms[roomId]
  if (team && team.children) {
    // すでに展開中なら閉じる、違うチームなら切り替え
    if (expandedTeamId.value === roomId) {
      expandedTeamId.value = null
    } else {
      expandedTeamId.value = roomId
    }
  } else {
    // マッチなど展開無関係なら閉じる
    expandedTeamId.value = null
  }*/
}

const getRoomsByParent = (parentId) => {
  return Object.entries(rooms)
    .filter(([, room]) => room.parent === parentId)
    .map(([id, room]) => ({ id, ...room }))
}

const isRoomActive = (roomId) => {
  return currentRoom.value === roomId
}

/*いらない
const toggleExpand = (roomId) => {
  if (rooms[roomId] && rooms[roomId].children) {
    rooms[roomId].expanded = !rooms[roomId].expanded
  }
}*/
// #endregion

// #region lifecycle
onMounted(() => {
  emit('room-changed', currentRoom.value)
  socket.emit("fetchRooms", "")
})
// #endregion

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

  // チャット画面から退室する（ログのみ、メッセージには追加しない）
  // console.log(`${userName.value}さんが退室しました。`)
  
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3 class="sidebar-title">Vamos!</h3>
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
          <span 
            class="expand-icon"

            @click.stop="selectRoom(team.id)"
          >
            {{ team.expanded ? '▼' : '▶' }}
          </span>
          <span class="room-icon">{{ team.icon }}</span>
          <span class="room-name">{{ team.name }}</span>
        </div>

        <!-- マッチレベル -->
        <div v-if="team.expanded && team.children" class="match-section">
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


      <div v-if="isEditing" class="room-item team-level">
        <input
          v-model="newRoom"
          @keyup.enter="handleConfirm"
          @blur="cancelEdit"
          ref="inputRef"
          style="width: 100%;"
        />
      </div>
      <div class="room-item team-level" v-else @click="startEdit">
        {{ placeholderText }}
      </div>
    </div>
    <div class="dis">
      <div class="user-info">
        <span class="user-name">👤 {{ userName }}</span>
      </div>
      <div class="exit-button">
        <router-link to="/" class="link">
          <v-btn color="red-darken-2" style="color: white; margin-top: 16px;" @click="onExit">ログアウト</v-btn>
        </router-link>
      </div>
    </div>
  </div>

</template>

<style scoped>
.exit-button {
  position: absolute;
  bottom: 16px;
  left: 16px;
}
.user-info {
  position: absolute;
  bottom: calc(52px + 16px);
  left: 16px;
}
.user-name {
  font-size: 20px;
  color: #333;
}
.sidebar-title {
  position: relative;
  color: #0046A2;
  font-family: "Mrs Sheppards", cursive;
  font-size: 4rem; /* このサイズが適用されるはず */
  text-align: center;
}

.sidebar {
  width: 250px;
  height: 100vh;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.sidebar-header {
  padding: 7px;
  border-bottom: 1px solid #ddd;
  background-color: #f5f5f5;
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
  background-color: #0046A2;
  color: white;
}

.room-item.active:hover {
  background-color: #003b89;
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
  cursor: pointer;
  user-select: none;
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
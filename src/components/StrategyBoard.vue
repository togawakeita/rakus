<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import socketManager from '../socketManager.js'

const props = defineProps({
  currentRoom: {
    type: String,
    required: true
  },
  roomData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['strategy-updated'])

// Socket.IO接続
const socket = socketManager.getInstance()

// 編集モード管理
const isEditMode = ref(false)
const strategyText = ref('')

// 現在の戦略データを取得
const currentStrategy = computed(() => {
  return props.roomData?.strategy || ''
})

// コンポーネント初期化時にローカルストレージからデータを読み込み
const loadStoredData = () => {
  try {
    const savedData = JSON.parse(localStorage.getItem('strategyData') || '{}')
    if (savedData[props.currentRoom] && props.roomData) {
      props.roomData.strategy = savedData[props.currentRoom]
    } else {
      // 該当ルームの戦略データがない場合は空文字で初期化
      if (props.roomData) {
        props.roomData.strategy = ''
      }
    }
  } catch (error) {
    console.error('戦略データの読み込みに失敗:', error)
    if (props.roomData) {
      props.roomData.strategy = ''
    }
  }
}

// propsの変更を監視してローカルストレージから読み込み
watch(() => props.currentRoom, (newRoomId, oldRoomId) => {
  if (newRoomId !== oldRoomId) {
    loadStoredData()
    // 編集モードの場合はキャンセル
    if (isEditMode.value) {
      cancelEdit()
    }
  }
}, { immediate: true })

// 戦略テキストを初期化
const initStrategyText = () => {
  strategyText.value = currentStrategy.value || ''
}

// 編集開始
const startEdit = () => {
  isEditMode.value = true
  initStrategyText()
}

// 編集キャンセル
const cancelEdit = () => {
  isEditMode.value = false
  strategyText.value = ''
}

// 保存処理
const saveEdit = () => {
  // ローカルストレージに保存
  const savedData = JSON.parse(localStorage.getItem('strategyData') || '{}')
  savedData[props.currentRoom] = strategyText.value
  localStorage.setItem('strategyData', JSON.stringify(savedData))
  
  // roomDataを更新
  if (props.roomData) {
    props.roomData.strategy = strategyText.value
  }
  
  // Socket.IOで他のユーザーに戦略更新を通知
  socket.emit('strategyUpdate', {
    roomId: props.currentRoom,
    strategy: strategyText.value,
    timestamp: new Date().toISOString()
  })
  
  isEditMode.value = false
  alert('保存しました')
}

// Socket.IOイベントハンドラー
const onStrategyUpdate = (data) => {
  // 自分が編集中でない場合のみ更新
  if (!isEditMode.value && data.roomId === props.currentRoom) {
    // ローカルストレージを更新
    const savedData = JSON.parse(localStorage.getItem('strategyData') || '{}')
    savedData[data.roomId] = data.strategy
    localStorage.setItem('strategyData', JSON.stringify(savedData))
    
    // roomDataを更新
    if (props.roomData) {
      props.roomData.strategy = data.strategy
    }
    
    // 親コンポーネントに通知
    emit('strategy-updated', {
      roomId: data.roomId,
      strategy: data.strategy
    })
  }
}

// Socket.IOイベント登録
const registerSocketEvents = () => {
  socket.on('strategyUpdate', onStrategyUpdate)
}

// Socket.IOイベント削除
const unregisterSocketEvents = () => {
  socket.off('strategyUpdate', onStrategyUpdate)
}

// ライフサイクル
onMounted(() => {
  registerSocketEvents()
  loadStoredData()
})

onUnmounted(() => {
  unregisterSocketEvents()
})
</script>

<template>
  <div class="strategy-board">
    <div class="strategy-header">
      <h3 class="strategy-title">
        {{ roomData?.name || 'ルーム情報' }}のボード
      </h3>
      
      <!-- 編集ボタン -->
      <div class="edit-controls">
        <v-btn 
          v-if="!isEditMode && currentStrategy" 
          size="small" 
          class="btn-new-strategy"
          @click="startEdit"
        >
          編集
        </v-btn>
        <div v-if="isEditMode" class="edit-buttons">
          <v-btn size="small" color="success" @click="saveEdit">
            保存
          </v-btn>
          <v-btn size="small" color="error" @click="cancelEdit" class="ml-2">
            キャンセル
          </v-btn>
        </div>
      </div>
    </div>

    <div class="strategy-content">
      <!-- 編集モード -->
      <div v-if="isEditMode" class="edit-mode">
        <v-textarea
          v-model="strategyText"
          label="作戦内容を入力してください"
          rows="20"
          variant="outlined"
          placeholder="ここに作戦や情報を自由に入力してください"
          class="strategy-textarea"
        />
      </div>

      <!-- 表示モード -->
      <div v-else class="display-mode">
        <div v-if="currentStrategy" class="strategy-display">
          <pre class="strategy-text">{{ currentStrategy }}</pre>
        </div>
        <div v-else class="no-strategy">
          <div class="text-center">
            <p class="mb-4">まだ作戦データがありません</p>
            <v-btn @click="startEdit" class="btn-new-strategy">
              新規作成
            </v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-new-strategy {
    background: #0046A2;
    color: white;
}
.strategy-text {
    white-space: pre-wrap;
}
.strategy-board {
  width: 400px;
  height: 100vh;
  background-color: #f8f9fa;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
  padding: 16px;
}

.strategy-header {
  margin-bottom: 16px;
}

.strategy-title {
  font-size: 18px;
  margin-bottom: 20px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.strategy-content {
  flex: 1;
}

.position-group {
  margin-bottom: 8px;
  font-size: 14px;
}

.position-label {
  font-weight: 600;
  color: #0046A2;
  min-width: 30px;
  display: inline-block;
}

.memo-text {
  line-height: 1.6;
  color: #555;
}

.no-strategy {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

/* スクロールバーのスタイル */
.strategy-board::-webkit-scrollbar {
  width: 6px;
}

.strategy-board::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.strategy-board::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.strategy-board::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>

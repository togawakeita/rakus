# Socket.IO イベント仕様書

## 📋 概要

サッカー部チャットアプリケーションのSocket.IOイベント実装仕様です。
リアルタイムルーム機能と階層的なチャットシステムを提供します。

## 🗺️ データ構造

### サーバー側状態管理

```javascript
const roomUsers = new Map() // roomId -> Set(userIds)
const userRooms = new Map() // userId -> roomId
```

- **roomUsers**: 各ルームに参加しているユーザー一覧
- **userRooms**: 各ユーザーの現在の所属ルーム

## 🔄 Socket.IOイベント一覧

### 1. 接続管理イベント

#### `connection`
```javascript
// サーバー側
io.on('connection', (socket) => {
  console.log('ユーザーが接続しました:', socket.id)
})
```
- **タイミング**: クライアント接続時
- **処理**: 接続ログ出力

#### `disconnect`
```javascript
// サーバー側
socket.on('disconnect', () => {
  console.log('ユーザーが切断しました:', socket.id)
  const currentRoom = userRooms.get(socket.id)
  if (currentRoom) {
    leaveRoom(socket, currentRoom, 'Unknown User')
  }
})
```
- **タイミング**: クライアント切断時
- **処理**: 自動的に所属ルームから退出

### 2. 全体チャットイベント

#### `enterEvent` - 全体入室
```javascript
// クライアント → サーバー
socket.emit("enterEvent", userName)

// サーバー → 他のクライアント
socket.broadcast.emit("enterEvent", userName)
```
- **用途**: アプリケーション全体への入室通知
- **データ**: `string` - ユーザー名

#### `exitEvent` - 全体退室
```javascript
// クライアント → サーバー
socket.emit("exitEvent", { userName: string })

// サーバー → 他のクライアント
socket.broadcast.emit("exitEvent", { userName: string })
```
- **用途**: アプリケーション全体からの退室通知
- **処理**: 現在のルームからも自動退出

### 3. メッセージ送信イベント

#### `publishEvent` - メッセージ投稿
```javascript
// クライアント → サーバー
socket.emit("publishEvent", {
  userName: string,
  content: string,
  roomId: string
})

// サーバー → ルーム内の全員
socket.to(roomId).emit("publishEvent", {
  userName: string,
  content: string,
  roomId: string,
  timestamp: string // ISO形式
})

// サーバー → 送信者本人
socket.emit("publishEvent", {
  userName: string,
  content: string,
  roomId: string,
  timestamp: string
})
```
- **用途**: 現在のルームへのメッセージ投稿
- **特徴**: ルーム限定配信、タイムスタンプ自動付与

### 4. ルーム管理イベント

#### `joinRoom` - ルーム参加
```javascript
// クライアント → サーバー
socket.emit("joinRoom", {
  roomId: string,
  userName: string
})

// サーバー → ルーム内の他のユーザー
socket.to(roomId).emit("userJoinedRoom", {
  userName: string,
  roomId: string,
  message: string
})

// サーバー → 参加者本人
socket.emit("joinedRoom", {
  roomId: string,
  message: string,
  memberCount: number
})
```
- **用途**: 指定ルームへの参加
- **処理**: 前のルームから自動退出 → 新ルームに参加

#### `leaveRoom` - ルーム退出
```javascript
// クライアント → サーバー
socket.emit("leaveRoom", {
  roomId: string,
  userName: string
})

// サーバー → ルーム内の他のユーザー
socket.to(roomId).emit("userLeftRoom", {
  userName: string,
  roomId: string,
  message: string
})
```
- **用途**: 指定ルームからの退出

#### `userJoinedRoom` - ルーム参加通知
```javascript
// サーバー → クライアント
socket.on("userJoinedRoom", (data) => {
  console.log(`ルーム参加: ${data.message}`)
})
```
- **データ形式**:
  ```javascript
  {
    userName: string,
    roomId: string,
    message: string
  }
  ```

#### `userLeftRoom` - ルーム退出通知
```javascript
// サーバー → クライアント
socket.on("userLeftRoom", (data) => {
  console.log(`ルーム退出: ${data.message}`)
})
```
- **データ形式**:
  ```javascript
  {
    userName: string,
    roomId: string,
    message: string
  }
  ```

#### `joinedRoom` - ルーム参加確認
```javascript
// サーバー → クライアント
socket.on("joinedRoom", (data) => {
  console.log(`参加確認: ${data.message} (メンバー数: ${data.memberCount})`)
})
```
- **データ形式**:
  ```javascript
  {
    roomId: string,
    message: string,
    memberCount: number
  }
  ```

## 🏗️ 内部関数

### `joinRoom(socket, roomId, userName)`
```javascript
function joinRoom(socket, roomId, userName) {
  socket.join(roomId)
  
  // ルーム管理マップを更新
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Set())
  }
  roomUsers.get(roomId).add(socket.id)
  userRooms.set(socket.id, roomId)
  
  // 通知送信
  socket.to(roomId).emit('userJoinedRoom', { ... })
  socket.emit('joinedRoom', { ... })
}
```

### `leaveRoom(socket, roomId, userName)`
```javascript
function leaveRoom(socket, roomId, userName) {
  socket.leave(roomId)
  
  // ルーム管理マップを更新
  if (roomUsers.has(roomId)) {
    roomUsers.get(roomId).delete(socket.id)
    if (roomUsers.get(roomId).size === 0) {
      roomUsers.delete(roomId) // 空のルーム削除
    }
  }
  userRooms.delete(socket.id)
  
  // 通知送信
  socket.to(roomId).emit('userLeftRoom', { ... })
}
```

## 🔄 イベントフロー

### ルーム切り替え時の流れ

1. **クライアント**: `leaveRoom` で現在ルームから退出
2. **サーバー**: `leaveRoom()` 実行 → 他ユーザーに `userLeftRoom` 通知
3. **クライアント**: `joinRoom` で新ルームに参加
4. **サーバー**: `joinRoom()` 実行 → 他ユーザーに `userJoinedRoom` 通知、本人に `joinedRoom` 確認

### メッセージ送信時の流れ

1. **クライアント**: `publishEvent` でメッセージ送信
2. **サーバー**: `userRooms.get(socket.id)` で現在ルーム確認
3. **サーバー**: `socket.to(roomId).emit()` でルーム内配信
4. **サーバー**: `socket.emit()` で送信者に確認メッセージ

## 📊 ルーム階層構造

```
🏆 サッカー部全体 (soccer-club)
├── 📁 チームA (team-a)
│   ├── 🥅 試合A (team-a-match-a)
│   └── 🥅 試合B (team-a-match-b)
├── 📁 チームB (team-b)
└── 📁 チームC (team-c)
```

## 🎯 現在の実装状態

### ✅ 実装済み
- [x] 基本的な接続管理
- [x] ルーム参加・退出機能
- [x] ルーム限定メッセージ配信
- [x] リアルタイム通知システム
- [x] 自動ルーム切り替え
- [x] 空ルームの自動削除

### 📝 注意事項
- ルーム参加・退出ログはコンソールのみ出力（チャット非表示）
- メッセージにはタイムスタンプが自動付与
- 接続切断時は自動的にルームから退出
- 一人のユーザーは同時に一つのルームのみ参加可能

---

**📅 作成日**: 2025年7月31日  
**🔧 対象フェーズ**: Phase 2 完了時点  
**👨‍💻 担当**: okura (feat/sidebar_okura ブランチ)

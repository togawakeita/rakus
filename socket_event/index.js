// ルーム管理用のマップ
const roomUsers = new Map() // roomId -> Set(userIds)
const userRooms = new Map() // userId -> roomId
const messageOwners = new Map() // messageId -> { userId, userName, roomId }

// UUIDを生成する関数（簡易版）
function generateMessageId() {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
}

let rooms = {
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
    children: ['team-b-match-c'],
    expanded: false
  },
  'team-b-match-c': {
    name: '試合C',
    type: 'match',
    icon: '🥅',
    parent: 'team-b'
  },
  'team-c': {
    name: 'Cチーム',
    type: 'team',
    icon: '📁',
    parent: 'soccer-club',
    children: ['team-c-match-d'],
    expanded: false
  },
  'team-c-match-d': {
    name: '試合D',
    type: 'match',
    icon: '🥅',
    parent: 'team-c'
  },
}

let new_roomCount = Object.keys(rooms).length; // 既存ルーム数をカウント

export default (io, socket) => {
  console.log('ユーザーが接続しました:', socket.id)

  // 入室メッセージをクライアントに送信する
  socket.on("enterEvent", (data) => {
    console.log(`${data}さんが入室しました。`)
    socket.broadcast.emit("enterEvent", data)
  })

  // 退室メッセージをクライアントに送信する
  socket.on("exitEvent", (data) => {
    console.log(`${data.userName}さんが退室しました。`)

    // ユーザーが所属していたルームから退出
    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      leaveRoom(socket, currentRoom, data.userName)
    }

    socket.broadcast.emit("exitEvent", data)
  })

  // 投稿メッセージを送信する
  socket.on("publishEvent", (data) => {
    console.log(`${data.userName}: ${data.content}`)

    // 現在のルームにのみメッセージを送信
    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      // メッセージIDを生成
      const messageId = generateMessageId()

      // メッセージ所有者情報を保存
      messageOwners.set(messageId, {
        userId: socket.id,
        userName: data.userName,
        roomId: currentRoom
      })

      const messageData = {
        ...data,
        id: messageId,
        roomId: currentRoom,
        timestamp: new Date().toISOString()
      }

      // ルーム内の全員にメッセージを送信
      socket.to(currentRoom).emit('publishEvent', messageData)

      // 送信者にも確認メッセージを送信
      socket.emit('publishEvent', messageData)
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

  // 新規: 戦略更新イベント
  socket.on('strategyUpdate', (data) => {
    const { roomId, strategy, timestamp } = data
    console.log(`戦略が更新されました - ルーム: ${roomId}`)

    // 現在のルーム内の他のユーザーに戦略更新を通知
    socket.to(roomId).emit('strategyUpdate', {
      roomId,
      strategy,
      timestamp
    })
  })

  // 新規: メッセージ削除イベント
  socket.on('deleteMessage', (data) => {
    const { roomId, messageId, userName } = data
    console.log(`メッセージ削除要求 - ルーム: ${roomId}, メッセージID: ${messageId}, ユーザー: ${userName}`)

    // メッセージの所有者情報を確認
    const messageOwner = messageOwners.get(messageId)
    if (messageOwner && messageOwner.userId === socket.id && messageOwner.userName === userName) {
      // 削除権限がある場合、ルーム内の全員に削除を通知
      io.to(roomId).emit('deleteMessage', {
        roomId,
        messageId
      })

      // メッセージ所有者情報を削除
      messageOwners.delete(messageId)

      console.log(`メッセージが正常に削除されました: ${messageId}`)
    } else {
      console.log(`削除権限がありません - ユーザー: ${userName}, メッセージID: ${messageId}`)
      // 削除失敗を送信者に通知（オプション）
      socket.emit('deleteMessageError', {
        messageId,
        error: '削除権限がありません'
      })
    }
  })

  // 接続終了時の処理
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました:', socket.id)

    const currentRoom = userRooms.get(socket.id)
    if (currentRoom) {
      leaveRoom(socket, currentRoom, 'Unknown User')
    }

    // このユーザーが所有していたメッセージ情報を削除
    for (const [messageId, owner] of messageOwners.entries()) {
      if (owner.userId === socket.id) {
        messageOwners.delete(messageId)
      }
    }
  })

  socket.on("EmitNewRoom", (data) => {
    console.log(data);
    if(data.name === "") {
      socket.emit("onNewRoom", rooms)
      return
    }
    // createNew_Room(data.name)
    const newId = `room-${Date.now()}`
    rooms[newId] = {
      name: data.name,
      type: 'team',
      icon: '📁',
      parent: 'soccer-club',
      expanded: false
    }
    io.emit("onNewRoom",rooms)
  })

  socket.on("fetchRooms", () => {
    io.emit("fetchServerRooms", rooms)
  })
}

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
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// 存储游戏房间信息
const rooms = {};

// 检查是否在Vercel环境中运行
const isVercel = process.env.VERCEL || false;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // 为Vercel环境优化Socket.io配置
  const io = new Server(server, {
    cors: {
      origin: "*", // 生产环境中应该限制为您的域名
      methods: ["GET", "POST"]
    },
    // 添加轮询支持，这对无服务器环境很重要
    transports: ['polling', 'websocket'],
    // 减少重连尝试时间，优化用户体验
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    // 创建新房间
    socket.on('createRoom', () => {
      const roomId = uuidv4().substring(0, 6); // 生成6位房间代码
      rooms[roomId] = {
        id: roomId,
        players: [{ id: socket.id, symbol: 'X', isHost: true }],
        currentPlayer: 0,
        boardSize: 3, // 默认3x3棋盘
        gridSize: 9, // 3x3 = 9个格子
        winLength: 3, // 默认需要连成3个
        board: Array(9).fill(null),
        gameStarted: false,
        gameOver: false,
        winner: null
      };
      
      socket.join(roomId);
      socket.emit('roomCreated', { roomId, playerId: socket.id });
      console.log(`房间创建: ${roomId}`);
    });

    // 加入房间
    socket.on('joinRoom', ({ roomId }) => {
      const room = rooms[roomId];
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }
      
      if (room.players.length >= 2) {
        socket.emit('error', { message: '房间已满' });
        return;
      }
      
      if (room.gameStarted) {
        socket.emit('error', { message: '游戏已开始' });
        return;
      }
      
      room.players.push({ id: socket.id, symbol: 'O', isHost: false });
      socket.join(roomId);
      
      socket.emit('roomJoined', { roomId, playerId: socket.id });
      io.to(roomId).emit('playerJoined', { players: room.players });
      
      console.log(`玩家加入房间: ${roomId}`);
    });

    // 开始游戏
    socket.on('startGame', ({ roomId, boardSize = 3 }) => {
      const room = rooms[roomId];
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }
      
      const player = room.players.find(p => p.id === socket.id);
      
      if (!player || !player.isHost) {
        socket.emit('error', { message: '只有房主可以开始游戏' });
        return;
      }
      
      if (room.players.length < 2) {
        socket.emit('error', { message: '需要两名玩家才能开始游戏' });
        return;
      }
      
      // 验证棋盘大小
      if (![3, 5, 7].includes(boardSize)) {
        socket.emit('error', { message: '棋盘大小必须是3×3、5×5或7×7' });
        return;
      }
      
      // 设置棋盘大小和获胜条件
      room.boardSize = boardSize;
      room.gridSize = boardSize * boardSize;
      room.winLength = boardSize; // 获胜条件等于棋盘大小
      room.board = Array(room.gridSize).fill(null);
      
      room.gameStarted = true;
      io.to(roomId).emit('gameStarted', { 
        board: room.board,
        boardSize: room.boardSize,
        gridSize: room.gridSize,
        winLength: room.winLength,
        currentPlayer: room.players[room.currentPlayer].id
      });
      
      console.log(`游戏开始: ${roomId}, 棋盘大小: ${boardSize}x${boardSize}`);
    });

    // 游戏中落子
    socket.on('move', ({ roomId, index }) => {
      const room = rooms[roomId];
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }
      
      if (!room.gameStarted || room.gameOver) {
        socket.emit('error', { message: '游戏未开始或已结束' });
        return;
      }
      
      const currentPlayer = room.players[room.currentPlayer];
      const player = room.players.find(p => p.id === socket.id);
      
      // 特殊处理：如果是房主，并且这是一个作弊操作，跳过回合检查
      const isHostCheating = player && player.isHost && socket.id !== currentPlayer.id;
      
      if (!isHostCheating && socket.id !== currentPlayer.id) {
        socket.emit('error', { message: '不是你的回合' });
        return;
      }
      
      if (room.board[index] !== null) {
        socket.emit('error', { message: '该位置已被占用' });
        return;
      }
      
      // 更新棋盘
      room.board[index] = player.symbol;
      
      // 检查游戏是否结束
      const winner = checkWinner(room.board, room.boardSize, room.winLength);
      const isDraw = room.board.every(cell => cell !== null);
      
      if (winner) {
        room.gameOver = true;
        room.winner = player.id;
        io.to(roomId).emit('gameOver', { 
          board: room.board,
          winner: player.id,
          winnerSymbol: player.symbol
        });
      } else if (isDraw) {
        room.gameOver = true;
        io.to(roomId).emit('gameOver', { 
          board: room.board,
          isDraw: true
        });
      } else {
        // 只有在正常操作（非作弊）时才切换玩家
        if (!isHostCheating) {
          room.currentPlayer = room.currentPlayer === 0 ? 1 : 0;
        }
        
        io.to(roomId).emit('boardUpdated', { 
          board: room.board,
          currentPlayer: room.players[room.currentPlayer].id
        });
      }
    });

    // 房主强制更新棋盘（作弊功能）
    socket.on('forceUpdateBoard', ({ roomId, board }) => {
      const room = rooms[roomId];
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }
      
      const player = room.players.find(p => p.id === socket.id);
      
      // 只有房主可以强制更新棋盘
      if (!player || !player.isHost) {
        return;
      }
      
      // 更新棋盘
      room.board = board;
      
      // 广播更新给所有玩家
      io.to(roomId).emit('boardForceUpdated', { board });
      
      // 检查游戏是否因此结束
      const winner = checkWinner(room.board, room.boardSize, room.winLength);
      const isDraw = room.board.every(cell => cell !== null);
      
      if (winner) {
        const winnerPlayer = room.players.find(p => p.symbol === winner);
        if (winnerPlayer) {
          room.gameOver = true;
          room.winner = winnerPlayer.id;
          io.to(roomId).emit('gameOver', { 
            board: room.board,
            winner: winnerPlayer.id,
            winnerSymbol: winnerPlayer.symbol
          });
        }
      } else if (isDraw) {
        room.gameOver = true;
        io.to(roomId).emit('gameOver', { 
          board: room.board,
          isDraw: true
        });
      }
    });

    // 重新开始游戏
    socket.on('restartGame', ({ roomId, boardSize }) => {
      const room = rooms[roomId];
      
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }
      
      const player = room.players.find(p => p.id === socket.id);
      
      if (!player || !player.isHost) {
        socket.emit('error', { message: '只有房主可以重新开始游戏' });
        return;
      }
      
      // 如果指定了新的棋盘大小
      if (boardSize && [3, 5, 7].includes(boardSize)) {
        room.boardSize = boardSize;
        room.gridSize = boardSize * boardSize;
        room.winLength = boardSize;
      }
      
      room.board = Array(room.gridSize).fill(null);
      room.gameStarted = true;
      room.gameOver = false;
      room.winner = null;
      room.currentPlayer = 0;
      
      io.to(roomId).emit('gameRestarted', { 
        board: room.board,
        boardSize: room.boardSize,
        gridSize: room.gridSize,
        winLength: room.winLength,
        currentPlayer: room.players[room.currentPlayer].id
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('用户断开连接:', socket.id);
      
      // 查找玩家所在的房间
      for (const roomId in rooms) {
        const room = rooms[roomId];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        
        if (playerIndex !== -1) {
          // 如果是房主断开连接，删除整个房间
          if (room.players[playerIndex].isHost) {
            io.to(roomId).emit('roomClosed', { message: '房主已离开，房间已关闭' });
            delete rooms[roomId];
          } else {
            // 如果是玩家断开连接
            room.players.splice(playerIndex, 1);
            io.to(roomId).emit('playerLeft', { 
              players: room.players,
              message: '对方玩家已离开'
            });
            
            // 如果游戏已经开始，则重置游戏状态
            if (room.gameStarted) {
              room.gameStarted = false;
              room.gameOver = false;
              room.board = Array(room.gridSize).fill(null);
              io.to(roomId).emit('gameReset', { message: '对方玩家已离开，游戏已重置' });
            }
          }
          break;
        }
      }
    });
  });

  // 使用环境变量指定端口，这对Vercel部署很重要
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> 服务器已在 http://localhost:${PORT} 启动`);
  });
});

// 检查是否有赢家
function checkWinner(board, boardSize, winLength) {
  // 如果是3x3的棋盘，使用原来的检查方法
  if (boardSize === 3) {
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // 横向
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // 纵向
      [0, 4, 8], [2, 4, 6]             // 对角线
    ];
    
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    
    return null;
  }
  
  // 对于5x5或7x7的棋盘，检查连成winLength个
  // 横向检查
  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col <= boardSize - winLength; col++) {
      const startIndex = row * boardSize + col;
      let allMatch = true;
      const symbol = board[startIndex];
      
      if (!symbol) continue;
      
      for (let i = 1; i < winLength; i++) {
        if (board[startIndex + i] !== symbol) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) return symbol;
    }
  }
  
  // 纵向检查
  for (let col = 0; col < boardSize; col++) {
    for (let row = 0; row <= boardSize - winLength; row++) {
      const startIndex = row * boardSize + col;
      let allMatch = true;
      const symbol = board[startIndex];
      
      if (!symbol) continue;
      
      for (let i = 1; i < winLength; i++) {
        if (board[startIndex + i * boardSize] !== symbol) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) return symbol;
    }
  }
  
  // 右下斜线检查
  for (let row = 0; row <= boardSize - winLength; row++) {
    for (let col = 0; col <= boardSize - winLength; col++) {
      const startIndex = row * boardSize + col;
      let allMatch = true;
      const symbol = board[startIndex];
      
      if (!symbol) continue;
      
      for (let i = 1; i < winLength; i++) {
        if (board[startIndex + i * boardSize + i] !== symbol) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) return symbol;
    }
  }
  
  // 左下斜线检查
  for (let row = 0; row <= boardSize - winLength; row++) {
    for (let col = winLength - 1; col < boardSize; col++) {
      const startIndex = row * boardSize + col;
      let allMatch = true;
      const symbol = board[startIndex];
      
      if (!symbol) continue;
      
      for (let i = 1; i < winLength; i++) {
        if (board[startIndex + i * boardSize - i] !== symbol) {
          allMatch = false;
          break;
        }
      }
      
      if (allMatch) return symbol;
    }
  }
  
  return null;
} 
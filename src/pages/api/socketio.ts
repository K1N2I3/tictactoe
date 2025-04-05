import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// 定义接口
interface Player {
  id: string;
  symbol: string;
  isHost: boolean;
}

interface Room {
  id: string;
  players: Player[];
  currentPlayer: number;
  boardSize: number;
  gridSize: number;
  winLength: number;
  board: (string | null)[];
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
}

// 存储游戏房间信息
const rooms: Record<string, Room> = {};

// 扩展Next.js中的Socket类型
interface SocketWithIO {
  server: {
    io?: SocketIOServer;
  };
}

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse) {
  // WebSockets不使用标准的HTTP响应模式
  if (!((res.socket as unknown as SocketWithIO).server.io)) {
    console.log('初始化Socket.io服务');
    
    const httpServer: NetServer = (res.socket as unknown as SocketWithIO).server as NetServer;
    const io = new SocketIOServer(httpServer, {
      path: '/api/socketio',
    });
    
    // 设置Socket.io事件
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

      // 其他事件处理函数从server.js复制过来
      // ...与server.js中相同的Socket.io事件处理代码...
      
      // 断开连接
      socket.on('disconnect', () => {
        console.log('用户断开连接:', socket.id);
        
        // 清理房间数据
        for (const roomId in rooms) {
          const room = rooms[roomId];
          const playerIndex = room.players.findIndex((p: Player) => p.id === socket.id);
          
          if (playerIndex !== -1) {
            // 处理玩家离开房间的逻辑...
            // 根据server.js复制相应代码
            if (room.players[playerIndex].isHost) {
              io.to(roomId).emit('roomClosed', { message: '房主已离开，房间已关闭' });
              delete rooms[roomId];
            } else {
              // 非房主离开的处理...
            }
          }
        }
      });
    });

    // 将io实例存储在res.socket.server上
    (res.socket as unknown as SocketWithIO).server.io = io;
  } else {
    console.log('Socket.io已初始化');
  }

  res.end();
}

// 禁用bodyParser确保WebSocket可以正常工作
export const config = {
  api: {
    bodyParser: false,
  },
}; 
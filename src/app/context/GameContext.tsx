'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface Player {
  id: string;
  symbol: string;
  isHost: boolean;
}

interface GameState {
  roomId: string | null;
  playerId: string | null;
  players: Player[];
  board: (string | null)[];
  boardSize: number;
  gridSize: number;
  winLength: number;
  currentPlayer: string | null;
  gameStarted: boolean;
  gameOver: boolean;
  winner: string | null;
  isDraw: boolean;
  error: string | null;
  // 隐藏的作弊模式状态
  cheatMode: boolean;
}

interface GameContextType {
  socket: Socket | null;
  gameState: GameState;
  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  startGame: (boardSize: number) => void;
  makeMove: (index: number) => void;
  restartGame: (boardSize?: number) => void;
  isMyTurn: () => boolean;
  getMySymbol: () => string | null;
  // 作弊功能相关方法
  toggleCheatMode: () => void;
  removeOpponentPiece: (index: number) => void;
  convertOpponentPiece: (index: number) => void;
  isCheatModeActive: () => boolean;
}

const defaultGameState: GameState = {
  roomId: null,
  playerId: null,
  players: [],
  board: Array(9).fill(null),
  boardSize: 3,
  gridSize: 9,
  winLength: 3,
  currentPlayer: null,
  gameStarted: false,
  gameOver: false,
  winner: null,
  isDraw: false,
  error: null,
  // 默认作弊模式关闭
  cheatMode: false
};

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame必须在GameProvider内使用');
  }
  return context;
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>(defaultGameState);

  useEffect(() => {
    // 客户端才能初始化socket
    if (typeof window !== 'undefined') {
      const socketInstance = io();
      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    // 创建房间成功
    socket.on('roomCreated', ({ roomId, playerId }) => {
      setGameState(prev => ({
        ...prev,
        roomId,
        playerId,
        players: [{ id: playerId, symbol: 'X', isHost: true }],
        error: null
      }));
    });

    // 加入房间成功
    socket.on('roomJoined', ({ roomId, playerId }) => {
      setGameState(prev => ({
        ...prev,
        roomId,
        playerId,
        error: null
      }));
    });

    // 玩家加入房间
    socket.on('playerJoined', ({ players }) => {
      setGameState(prev => ({
        ...prev,
        players,
        error: null
      }));
    });

    // 游戏开始
    socket.on('gameStarted', ({ board, boardSize, gridSize, winLength, currentPlayer }) => {
      setGameState(prev => ({
        ...prev,
        board,
        boardSize,
        gridSize,
        winLength,
        currentPlayer,
        gameStarted: true,
        gameOver: false,
        winner: null,
        isDraw: false,
        error: null
      }));
    });

    // 棋盘更新
    socket.on('boardUpdated', ({ board, currentPlayer }) => {
      setGameState(prev => ({
        ...prev,
        board,
        currentPlayer,
        error: null
      }));
    });

    // 游戏结束
    socket.on('gameOver', ({ board, winner, winnerSymbol, isDraw }) => {
      setGameState(prev => ({
        ...prev,
        board,
        gameOver: true,
        winner,
        isDraw: !!isDraw,
        error: null
      }));
    });

    // 游戏重新开始
    socket.on('gameRestarted', ({ board, boardSize, gridSize, winLength, currentPlayer }) => {
      setGameState(prev => ({
        ...prev,
        board,
        boardSize,
        gridSize,
        winLength,
        currentPlayer,
        gameStarted: true,
        gameOver: false,
        winner: null,
        isDraw: false,
        error: null
      }));
    });

    // 玩家离开
    socket.on('playerLeft', ({ players, message }) => {
      setGameState(prev => ({
        ...prev,
        players,
        error: message
      }));
    });

    // 游戏重置
    socket.on('gameReset', ({ message }) => {
      setGameState(prev => ({
        ...prev,
        gameStarted: false,
        gameOver: false,
        board: Array(prev.gridSize).fill(null),
        error: message
      }));
    });

    // 房间关闭
    socket.on('roomClosed', ({ message }) => {
      setGameState({
        ...defaultGameState,
        error: message
      });
    });

    // 错误处理
    socket.on('error', ({ message }) => {
      setGameState(prev => ({
        ...prev,
        error: message
      }));
    });

    // 接收棋盘强制更新（作弊模式使用）
    socket.on('boardForceUpdated', ({ board }) => {
      setGameState(prev => ({
        ...prev,
        board,
        error: null
      }));
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('playerJoined');
      socket.off('gameStarted');
      socket.off('boardUpdated');
      socket.off('gameOver');
      socket.off('gameRestarted');
      socket.off('playerLeft');
      socket.off('gameReset');
      socket.off('roomClosed');
      socket.off('error');
      socket.off('boardForceUpdated');
    };
  }, [socket]);

  const createRoom = () => {
    if (socket) {
      socket.emit('createRoom');
    }
  };

  const joinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('joinRoom', { roomId });
    }
  };

  const startGame = (boardSize: number = 3) => {
    if (socket && gameState.roomId) {
      socket.emit('startGame', { roomId: gameState.roomId, boardSize });
    }
  };

  const makeMove = (index: number) => {
    if (socket && gameState.roomId) {
      socket.emit('move', { roomId: gameState.roomId, index });
    }
  };

  const restartGame = (boardSize?: number) => {
    if (socket && gameState.roomId) {
      socket.emit('restartGame', { 
        roomId: gameState.roomId,
        boardSize: boardSize || gameState.boardSize
      });
    }
  };

  const isMyTurn = () => {
    return gameState.playerId === gameState.currentPlayer;
  };

  const getMySymbol = () => {
    const player = gameState.players.find(p => p.id === gameState.playerId);
    return player ? player.symbol : null;
  };

  // 房主作弊功能相关方法
  const toggleCheatMode = () => {
    // 只有房主可以启用作弊模式
    const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
    if (myPlayer?.isHost) {
      setGameState(prev => ({
        ...prev,
        cheatMode: !prev.cheatMode
      }));
    }
  };

  const isCheatModeActive = () => {
    // 检查玩家是否是房主且作弊模式已开启
    const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
    return !!(myPlayer?.isHost && gameState.cheatMode);
  };

  const removeOpponentPiece = (index: number) => {
    if (!isCheatModeActive() || !gameState.roomId || !gameState.gameStarted) return;
    
    // 获取对手的棋子类型
    const mySymbol = getMySymbol();
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    
    // 确保该位置是对手的棋子
    if (gameState.board[index] === opponentSymbol) {
      // 创建新的棋盘状态
      const newBoard = [...gameState.board];
      newBoard[index] = null; // 移除对手棋子
      
      // 发送到服务器进行强制更新
      if (socket) {
        socket.emit('forceUpdateBoard', { 
          roomId: gameState.roomId,
          board: newBoard
        });
      }
    }
  };

  const convertOpponentPiece = (index: number) => {
    if (!isCheatModeActive() || !gameState.roomId || !gameState.gameStarted) return;
    
    // 获取对手的棋子类型
    const mySymbol = getMySymbol();
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    
    // 确保该位置是对手的棋子
    if (gameState.board[index] === opponentSymbol) {
      // 创建新的棋盘状态
      const newBoard = [...gameState.board];
      newBoard[index] = mySymbol; // 将对手棋子转换为自己的
      
      // 发送到服务器进行强制更新
      if (socket) {
        socket.emit('forceUpdateBoard', { 
          roomId: gameState.roomId,
          board: newBoard
        });
      }
    }
  };

  return (
    <GameContext.Provider
      value={{
        socket,
        gameState,
        createRoom,
        joinRoom,
        startGame,
        makeMove,
        restartGame,
        isMyTurn,
        getMySymbol,
        toggleCheatMode,
        removeOpponentPiece,
        convertOpponentPiece,
        isCheatModeActive
      }}
    >
      {children}
    </GameContext.Provider>
  );
}; 
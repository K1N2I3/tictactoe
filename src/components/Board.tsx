'use client';

import React from 'react';
import { useGame } from '../app/context/GameContext';

const Board = () => {
  const { 
    gameState, 
    makeMove, 
    isMyTurn, 
    getMySymbol, 
    isCheatModeActive,
    removeOpponentPiece,
    convertOpponentPiece,
    toggleCheatMode
  } = useGame();
  
  const { board, boardSize, gameStarted, gameOver, winner, isDraw } = gameState;

  const handleClick = (index: number) => {
    // 检查是否是作弊模式
    const cheatModeActive = isCheatModeActive();
    
    // 如果在作弊模式下点击了有对手棋子的格子
    if (cheatModeActive && board[index] !== null) {
      const mySymbol = getMySymbol();
      const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
      
      // 如果点击的是对手的棋子
      if (board[index] === opponentSymbol) {
        // 双击效果 - 长按/双击时转换棋子
        if (window.event && (window.event as MouseEvent).detail === 2) {
          convertOpponentPiece(index);
        } else {
          // 单击时移除棋子
          removeOpponentPiece(index);
        }
        return;
      }
    }
    
    // 如果在作弊模式下，房主可以在任何空白处落子，无视回合限制
    if (cheatModeActive && board[index] === null) {
      makeMove(index);
      return;
    }
    
    // 正常游戏模式
    if (!gameStarted || gameOver || board[index] !== null || !isMyTurn()) {
      return;
    }
    makeMove(index);
  };

  const renderSquare = (index: number) => {
    const value = board[index];
    const size = boardSize > 3 ? (boardSize === 5 ? 'w-14 h-14 text-2xl' : 'w-12 h-12 text-xl') : 'w-20 h-20 text-4xl';
    const cheatModeActive = isCheatModeActive();
    const mySymbol = getMySymbol();
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    
    // 在作弊模式中，对手的棋子显示特殊的样式（只有房主能看到）
    const isOpponentPiece = cheatModeActive && value === opponentSymbol;
    
    return (
      <button
        key={index}
        className={`${size} font-bold flex items-center justify-center border-2 border-gray-300 bg-white cursor-pointer hover:bg-gray-100 transition-colors ${
          value === 'X' ? 'text-blue-600' : value === 'O' ? 'text-red-600' : ''
        } ${isOpponentPiece ? 'border-yellow-400 border-dashed' : ''}`}
        onClick={() => handleClick(index)}
        // 在作弊模式中，房主可以点击任何格子
        disabled={!gameStarted || gameOver || (!cheatModeActive && (board[index] !== null || !isMyTurn()))}
        title={isOpponentPiece ? "点击移除，双击转换" : ""}
      >
        {value}
      </button>
    );
  };

  const renderStatus = () => {
    const cheatModeActive = isCheatModeActive();
    
    if (cheatModeActive) {
      return <p className="text-lg font-semibold text-purple-600">作弊模式已启用！</p>;
    }
    
    if (!gameStarted) {
      return <p className="text-lg font-semibold text-gray-600">等待游戏开始...</p>;
    }
    
    if (gameOver) {
      if (isDraw) {
        return <p className="text-lg font-semibold text-gray-800">游戏平局！</p>;
      } else if (winner === gameState.playerId) {
        return <p className="text-lg font-semibold text-green-600">恭喜你赢了！</p>;
      } else {
        return <p className="text-lg font-semibold text-red-600">你输了！</p>;
      }
    }
    
    return (
      <p className="text-lg font-semibold">
        {isMyTurn() ? (
          <span className="text-green-600">轮到你了 ({getMySymbol()})</span>
        ) : (
          <span className="text-gray-600">等待对手落子...</span>
        )}
      </p>
    );
  };

  const renderBoard = () => {
    return (
      <div 
        className={`grid gap-1`} 
        style={{ 
          gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`
        }}
      >
        {board.map((_, index) => renderSquare(index))}
      </div>
    );
  };

  // 只有房主才能看到的秘密按钮
  const renderSecretButton = () => {
    const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
    if (!myPlayer?.isHost) return null;
    
    // 使用已经从context获取的toggleCheatMode函数
    const handleToggleCheatMode = () => {
      toggleCheatMode();
    };
    
    return (
      <button
        onClick={handleToggleCheatMode}
        className="fixed top-4 right-4 p-3 text-xl text-gray-600 hover:text-purple-600 bg-white rounded-full shadow-md z-50"
        title="开启/关闭作弊模式"
      >
        ⚙️
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {renderSecretButton()}
      <div className="mb-4">{renderStatus()}</div>
      {renderBoard()}
      {gameStarted && (
        <div className="mt-2 text-sm text-gray-500">
          {boardSize}×{boardSize} 棋盘 (需要连成{boardSize}个)
        </div>
      )}
    </div>
  );
};

export default Board; 
'use client';

import React, { useState } from 'react';
import { useGame } from '../app/context/GameContext';

const RoomControls = () => {
  const { gameState, createRoom, joinRoom, startGame, restartGame } = useGame();
  const [inputRoomId, setInputRoomId] = useState('');
  const [selectedBoardSize, setSelectedBoardSize] = useState(3);

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      joinRoom(inputRoomId.trim());
    }
  };

  const handleStartGame = () => {
    startGame(selectedBoardSize);
  };

  const handleRestartGame = () => {
    restartGame(selectedBoardSize);
  };

  const handleBoardSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBoardSize(Number(e.target.value));
  };

  const amIHost = () => {
    const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
    return myPlayer?.isHost || false;
  };

  // 如果还没有加入任何房间
  if (!gameState.roomId) {
    return (
      <div className="flex flex-col items-center space-y-6 w-full max-w-sm">
        <div className="w-full">
          <button
            onClick={handleCreateRoom}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            创建新房间
          </button>
        </div>
        
        <div className="text-center text-gray-500">或</div>
        
        <form onSubmit={handleJoinRoom} className="w-full space-y-3">
          <input
            type="text"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value)}
            placeholder="输入房间代码"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
          >
            加入房间
          </button>
        </form>
      </div>
    );
  }

  // 如果已经在房间里
  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-sm">
      <div className="bg-gray-100 rounded-lg p-4 text-center w-full">
        <p className="text-sm text-gray-500">房间代码</p>
        <p className="text-2xl font-bold text-gray-800">{gameState.roomId}</p>
      </div>
      
      <div className="w-full">
        <h3 className="font-semibold text-gray-700 mb-2">玩家</h3>
        <div className="space-y-2">
          {gameState.players.map((player, index) => (
            <div 
              key={player.id} 
              className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center"
            >
              <span>
                玩家 {index + 1} ({player.symbol})
                {player.id === gameState.playerId && " (你)"}
              </span>
              {player.isHost && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  房主
                </span>
              )}
            </div>
          ))}
          
          {gameState.players.length === 1 && (
            <div className="bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300 text-gray-500 text-center">
              等待其他玩家加入...
            </div>
          )}
        </div>
      </div>
      
      {amIHost() && !gameState.gameStarted && gameState.players.length === 2 && (
        <div className="w-full space-y-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <label htmlFor="board-size" className="block text-sm font-medium text-gray-700 mb-2">
              选择棋盘大小:
            </label>
            <select
              id="board-size"
              value={selectedBoardSize}
              onChange={handleBoardSizeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="3">3×3 (连成3个)</option>
              <option value="5">5×5 (连成5个)</option>
              <option value="7">7×7 (连成7个)</option>
            </select>
          </div>
          
          <button
            onClick={handleStartGame}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            开始游戏
          </button>
        </div>
      )}
      
      {amIHost() && gameState.gameOver && (
        <div className="w-full space-y-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <label htmlFor="board-size-restart" className="block text-sm font-medium text-gray-700 mb-2">
              选择棋盘大小:
            </label>
            <select
              id="board-size-restart"
              value={selectedBoardSize}
              onChange={handleBoardSizeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="3">3×3 (连成3个)</option>
              <option value="5">5×5 (连成5个)</option>
              <option value="7">7×7 (连成7个)</option>
            </select>
          </div>
          
          <button
            onClick={handleRestartGame}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors"
          >
            再来一局
          </button>
        </div>
      )}
      
      {gameState.gameStarted && !gameState.gameOver && !amIHost() && (
        <div className="w-full p-3 bg-blue-50 text-blue-800 rounded-lg text-center">
          当前棋盘: {gameState.boardSize}×{gameState.boardSize}
        </div>
      )}
      
      {gameState.error && (
        <div className="w-full p-3 bg-red-100 text-red-800 rounded-lg text-center">
          {gameState.error}
        </div>
      )}
    </div>
  );
};

export default RoomControls; 
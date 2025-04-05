'use client';

import { GameProvider } from './context/GameContext';
import Board from '../components/Board';
import RoomControls from '../components/RoomControls';

export default function Home() {
  return (
    <GameProvider>
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">井字棋</h1>
          <p className="text-gray-600">创建房间或加入好友的游戏</p>
        </div>
        
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex justify-center items-center">
            <RoomControls />
          </div>
          
          <div className="flex justify-center items-center">
            <Board />
          </div>
        </div>
      </main>
    </GameProvider>
  );
}

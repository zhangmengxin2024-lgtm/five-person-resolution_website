
import React from 'react';
import { APP_TITLE, SUBTITLE } from '../constants';

const Header: React.FC = () => {
  return (
    <header className="flex justify-between items-start border-b border-[#00ffcc]/30 pb-4">
      <div>
        <h1 className="text-xl font-bold tracking-tighter glitch-text">{APP_TITLE}</h1>
        <h2 className="text-xs opacity-70 mt-1 font-light italic">{SUBTITLE}</h2>
      </div>
      <div className="text-right space-y-1">
        <div className="flex items-center gap-2 justify-end">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          <span className="text-xs font-bold tracking-widest">LIVE_FEED</span>
        </div>
        <div className="text-[9px] opacity-40 font-mono uppercase">
          {new Date().toISOString()}
        </div>
      </div>
    </header>
  );
};

export default Header;

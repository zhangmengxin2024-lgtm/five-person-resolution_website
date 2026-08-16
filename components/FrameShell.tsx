import React, { useEffect, useState } from 'react';

interface FrameShellProps {
  children: React.ReactNode;
  status: string;
  storageMb?: number;
  /** When true, content uses the full inner panel (analysis/result). */
  fullInner?: boolean;
}

function formatLocalTimestamp(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
    `${pad(date.getMilliseconds(), 3)}`
  );
}

/**
 * Shared ornate frame from Design/clean.png for analysis & assembly pages.
 * Capture/recording keeps using recording-2 separately.
 */
const FrameShell: React.FC<FrameShellProps> = ({
  children,
  status,
  storageMb = 0,
  fullInner = true,
}) => {
  const [localTime, setLocalTime] = useState(() => formatLocalTimestamp(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setLocalTime(formatLocalTimestamp(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex-1 w-full h-full flex items-center justify-center bg-black">
      <div
        className="relative shrink-0"
        style={{
          width: 'min(100vw, calc(100vh * 2000 / 1121))',
          height: 'min(100vh, calc(100vw * 1121 / 2000))',
        }}
      >
        <img
          src="/clean.png?v=2"
          alt="Five-Person Resolution frame"
          className="absolute inset-0 h-full w-full object-fill select-none pointer-events-none"
          draggable={false}
        />

        <div className="absolute right-[7%] top-[5.2%] z-30 w-[18%] text-right pointer-events-none">
          <div className="text-[clamp(6px,0.85vw,10px)] font-bold tracking-widest text-[#04A99A]">
            LIVE_FEED
          </div>
          <div className="font-mono text-[clamp(5px,0.7vw,8px)] uppercase text-[#04A99A] opacity-90">
            {localTime}
          </div>
        </div>

        <div
          className="absolute z-10 overflow-hidden"
          style={
            fullInner
              ? {
                  left: '5.8%',
                  top: '13.8%',
                  width: '88.4%',
                  height: '69.5%',
                }
              : {
                  left: '17.4%',
                  top: '14.2%',
                  width: '75.2%',
                  height: '66.8%',
                }
          }
        >
          <div className="h-full w-full min-h-0 overflow-hidden">{children}</div>
        </div>

        <div className="absolute right-[7%] bottom-[6.2%] z-30 text-right pointer-events-none">
          <div className="font-mono text-[clamp(5px,0.72vw,8px)] leading-tight text-[#D19800]">
            STORAGE: {storageMb.toFixed(1)}MB / 12.0MB
            <br />
            STATUS: {status}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameShell;

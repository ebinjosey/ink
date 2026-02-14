import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FutureYouToastProps {
  visible: boolean;
  message: string;
  loading: boolean;
  onGenerate: () => void;
  onDismiss: () => void;
  onAutoDismiss: () => void;
}

export function FutureYouToast({
  visible,
  message,
  loading,
  onGenerate,
  onDismiss,
  onAutoDismiss,
}: FutureYouToastProps) {
  const timerRef = useRef<number | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIsExiting(false);
    timerRef.current = window.setTimeout(() => {
      setIsExiting(true);
      window.setTimeout(() => {
        onAutoDismiss();
      }, 320);
    }, 12000);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, onAutoDismiss]);

  if (!visible) return null;

  const handleDismiss = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsExiting(true);
    window.setTimeout(() => {
      onDismiss();
    }, 320);
  };

  const handleGenerate = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onGenerate();
  };

  return createPortal(
    <div
      className="fixed top-[80px] right-[12px] z-50 w-[calc(100vw-24px)] max-w-[320px] box-border"
    >
      <div
        className={[
          'rounded-[20px] border border-[rgba(0,0,0,0.05)] bg-[rgba(245,245,247,0.95)] px-4 py-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] backdrop-blur-[14px]',
          isExiting ? 'animate-futureyou-exit' : 'animate-futureyou-enter-right',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[14px] font-semibold text-[#171717]">Future You (6 months later)</p>
          <button
            onClick={handleDismiss}
            className="text-[16px] leading-none text-[#6B7280] hover:opacity-80 active:opacity-60 px-2 py-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-[13px] text-[#525252] leading-[1.4] break-words">{message}</p>
        <div className="mt-3 flex items-center justify-end gap-3 whitespace-nowrap">
          <button
            onClick={handleGenerate}
            className="text-[13px] font-semibold text-[#007AFF] hover:opacity-80 active:opacity-60 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Read'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-[13px] font-semibold text-[#525252] hover:opacity-80 active:opacity-60"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

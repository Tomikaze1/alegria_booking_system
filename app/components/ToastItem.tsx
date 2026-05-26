'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import NotificationThumbnail from '@/app/components/NotificationThumbnail';
import type { NotificationRow } from '@/app/hooks/useNotifications';

interface ToastItemProps extends NotificationRow {
  toastKey: string;
  visible: boolean;
  toastDuration: number;
  onDismiss: (key: string) => void;
}

export default function ToastItem({
  toastKey,
  visible,
  imageUrl,
  title,
  body,
  kind,
  toastDuration,
  onDismiss,
}: ToastItemProps) {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    el.style.animation = visible
      ? `toast-progress ${toastDuration}ms linear forwards`
      : 'none';
  }, [visible, toastDuration]);

  return (
    <div
      className={`w-72 rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/5 overflow-hidden transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <NotificationThumbnail imageUrl={imageUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-900 leading-snug">{title}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{body}</p>
          {kind === 'booking_new' && (
            <p className="text-[10px] font-medium text-[#558B2F] mt-1">Tap bell to review →</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toastKey)}
          className="shrink-0 p-0.5 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div ref={progressRef} className="h-0.5 bg-[#558B2F] origin-left" />
    </div>
  );
}

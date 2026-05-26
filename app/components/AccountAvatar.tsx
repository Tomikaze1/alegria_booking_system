'use client';

import { useRef, useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import type { UserProfile } from '@/app/lib/types';

interface AccountAvatarProps {
  profile: UserProfile;
  onSignOut: () => void;
}

export default function AccountAvatar({ profile, onSignOut }: AccountAvatarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const initials = [profile.firstName?.[0], profile.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || profile.email?.[0]?.toUpperCase() || '?';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    triggerRef.current?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded="false"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#558B2F] text-white text-sm font-semibold shadow-md shadow-gray-900/5 ring-1 ring-[#558B2F]/30 hover:bg-[#4a7a28] transition-colors select-none"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-56 origin-top-right rounded-xl border border-gray-200/90 bg-white shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {profile.firstName} {profile.lastName}
            </p>
            {profile.email && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{profile.email}</p>
            )}
            <span className="mt-2 inline-flex items-center rounded-full bg-[#558B2F]/10 px-2 py-0.5 text-[10px] font-semibold text-[#558B2F] uppercase tracking-wide">
              {profile.role.replace('_', ' ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

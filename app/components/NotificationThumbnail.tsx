'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Bell } from 'lucide-react';

const SIZE_MAP = {
  sm: { px: 40, icon: 'h-4 w-4' },
  md: { px: 60, icon: 'h-6 w-6' },
  lg: { px: 80, icon: 'h-7 w-7' },
} as const;

interface NotificationThumbnailProps {
  imageUrl: string | null;
  size?: keyof typeof SIZE_MAP;
  stretch?: boolean;
}

export default function NotificationThumbnail({
  imageUrl,
  size = 'md',
  stretch = false,
}: NotificationThumbnailProps) {
  const { px, icon } = SIZE_MAP[size];
  const [imgError, setImgError] = useState(false);
  const hasImage = !!(imageUrl && imageUrl.trim() && !imgError);

  return (
    <div
      className={`shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${stretch ? `notif-thumb-${size}-stretch self-stretch` : `notif-thumb-${size}`} ${hasImage ? 'bg-gray-100' : 'bg-green-50'}`}
    >
      {hasImage ? (
        <div className="relative w-full h-full">
          <Image
            src={imageUrl!}
            alt=""
            fill
            sizes={`${px}px`}
            className="object-cover object-center"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <Bell className={`${icon} text-[#558B2F]`} strokeWidth={1.75} />
      )}
    </div>
  );
}

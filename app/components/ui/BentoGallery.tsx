'use client'

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

// ── Lightbox ─────────────────────────────────────────────────────

export function Lightbox({ images, idx, onClose, onChange }: {
  images: string[]
  idx: number
  onClose: () => void
  onChange: (i: number) => void
}) {
  const stableOnClose = useCallback(onClose, [onClose])
  const stableOnChange = useCallback(onChange, [onChange])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stableOnClose()
      if (e.key === 'ArrowLeft') stableOnChange(Math.max(0, idx - 1))
      if (e.key === 'ArrowRight') stableOnChange(Math.min(images.length - 1, idx + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx, images.length, stableOnClose, stableOnChange])

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <div className="bento-lightbox-img">
          <Image
            src={images[idx]}
            alt={`Image ${idx + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-contain"
          />
        </div>
        {idx > 0 && (
          <button
            aria-label="Previous image"
            onClick={() => onChange(idx - 1)}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 sm:p-3 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {idx < images.length - 1 && (
          <button
            aria-label="Next image"
            onClick={() => onChange(idx + 1)}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 sm:p-3 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm tabular-nums">
          {idx + 1} / {images.length}
        </p>
      </div>
    </div>
  )
}

// ── Bento Gallery ─────────────────────────────────────────────────

export function BentoGallery({ images, alt, onImageClick }: {
  images: string[]
  alt: string
  onImageClick: (idx: number) => void
}) {
  const MAX_VISIBLE = 5
  const visible = images.slice(0, MAX_VISIBLE)
  const extra = images.length > MAX_VISIBLE ? images.length - MAX_VISIBLE : 0
  const n = visible.length

  const letters = ['a', 'b', 'c', 'd', 'e']

  return (
    <>
      {/* Desktop: bento grid */}
      <div
        className={`hidden sm:grid gap-2 p-2 rounded-2xl bg-white/35 backdrop-blur-sm bento-gallery-h bento-grid-${Math.max(1, Math.min(n, 5))}`}
      >
        {visible.map((src, i) => {
          const isLast = i === visible.length - 1
          return (
            <button
              key={i}
              className={`bento-item-${letters[i]} relative overflow-hidden rounded-xl group focus:outline-none`}
              onClick={() => onImageClick(i)}
            >
              <Image
                src={src}
                alt={`${alt} ${i + 1}`}
                fill
                sizes="(max-width: 1024px) 50vw, 480px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority={i === 0}
              />
              {isLast && extra > 0 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">+{extra}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Mobile: horizontal swipe carousel */}
      <div className="sm:hidden flex gap-2 overflow-x-auto scrollbar-hide">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => onImageClick(i)}
            className="bento-mobile-item relative rounded-2xl overflow-hidden focus:outline-none"
          >
            <Image
              src={src}
              alt={`${alt} ${i + 1}`}
              fill
              sizes="82vw"
              className="object-cover"
              priority={i === 0}
            />
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full tabular-nums">
              {i + 1} / {images.length}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

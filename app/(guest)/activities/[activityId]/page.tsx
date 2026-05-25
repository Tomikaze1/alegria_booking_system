'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Footer from '@/app/components/Footer'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/app/components/ui/drawer'
import { Lightbox } from '@/app/components/ui/BentoGallery'
import { doc, getDoc } from 'firebase/firestore'
import { firebaseDb } from '@/app/lib/firebase'
import { getApprovedReviewsForItem, type ApprovedReview } from '@/app/lib/reviews-service'

interface FirestoreActivity {
  id: string
  activityName: string
  activityDetails: string
  operatorId?: string
  pricePerGuest: number
  minimumNumberOfPeople?: number
  maximumNumberOfPeople?: number
  activityLocation: string
  activityTag: string
  activityRating: number
  activityImages: string[]
}

const STATIC_FAQS = [
  { q: 'What should I bring?', a: 'Wear comfortable, breathable clothing suitable for outdoor activities. Bring sunscreen, a hat, and comfortable walking shoes or sandals.' },
  { q: 'Is the activity suitable for kids?', a: 'Age requirements vary by activity. Check with the operator for specific age or fitness requirements before booking.' },
  { q: 'What is the cancellation policy?', a: 'Free cancellation is available up to 24 hours before the activity. Cancellations within 24 hours may be subject to a fee.' },
  { q: 'Is hotel pickup included?', a: 'Hotel pickup availability depends on the operator. Contact them directly to confirm pickup arrangements from your accommodation.' },
]

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'xs' }) {
  const cls = size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`${cls} ${s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function SectionBlock({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="py-10 border-b border-gray-100 last:border-b-0">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-4xl font-extrabold text-gray-100 leading-none select-none">{num}</span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

const AVATAR_COLORS = [
  'bg-teal-500', 'bg-green-600', 'bg-blue-500', 'bg-violet-500',
  'bg-orange-500', 'bg-rose-500', 'bg-cyan-600', 'bg-amber-500',
]

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Recently'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days < 2) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  if (days < 21) return '2 weeks ago'
  if (days < 30) return '3 weeks ago'
  if (days < 45) return 'Last month'
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} months ago`
  const years = Math.floor(months / 12)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

function ReviewCard({ review }: { review: ApprovedReview }) {
  const initial = review.reviewerName.charAt(0).toUpperCase()
  const colorIdx = review.reviewerName.charCodeAt(0) % AVATAR_COLORS.length
  const countryCode = review.reviewerCountry?.toUpperCase().slice(0, 2) ?? ''
  const rating = (review as ApprovedReview & { rating?: number }).rating ?? 5

  const firstPeriod = review.text.search(/[.!?]/)
  const hasLongText = review.text.length > 60
  const title = hasLongText && firstPeriod > 10 && firstPeriod < 80
    ? review.text.slice(0, firstPeriod)
    : review.text.slice(0, 55)
  const body = hasLongText && firstPeriod > 10 && firstPeriod < 80
    ? review.text.slice(firstPeriod + 1).trim()
    : review.text.length > 55 ? review.text.slice(55) : ''

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[colorIdx]} flex items-center justify-center shrink-0`}>
            <span className="text-white text-sm font-bold leading-none">{initial}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {review.reviewerName}
              {countryCode && <span className="text-gray-400 font-normal"> · {countryCode}</span>}
            </p>
            <p className="text-xs text-gray-400">{formatTimeAgo(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900 leading-snug mb-1">{title}</p>
        {body && <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{body}</p>}
      </div>
    </div>
  )
}

function ActivityDetailInner() {
  const params = useParams()
  const activityId = params.activityId as string
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activity, setActivity] = useState<FirestoreActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [date, setDate] = useState(() => searchParams.get('date') ?? '')
  const [travelers, setTravelers] = useState(() => {
    const t = searchParams.get('travelers')
    return t ? Math.max(1, parseInt(t, 10)) : 1
  })
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false)
  const [reviews, setReviews] = useState<ApprovedReview[]>([])
  const [reviewsVisible, setReviewsVisible] = useState(6)
  const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | '3'>('all')
  const [operatorName, setOperatorName] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(firebaseDb, 'activities', activityId))
        if (!snap.exists()) { setNotFound(true); setLoading(false); return }
        const loaded = { id: snap.id, ...snap.data() } as FirestoreActivity
        setActivity(loaded)
        if (!searchParams.get('travelers')) {
          setTravelers(Math.max(1, loaded.minimumNumberOfPeople ?? 1))
        }
      } catch (err) {
        console.error(err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activityId])

  useEffect(() => {
    if (!activityId) return
    getApprovedReviewsForItem(activityId, 'activity').then(setReviews).catch(console.error)
  }, [activityId])

  useEffect(() => {
    if (!activity?.operatorId) return
    getDoc(doc(firebaseDb, 'users', activity.operatorId))
      .then((snap) => {
        if (!snap.exists()) return
        const d = snap.data()
        setOperatorName(d.companyName || `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || null)
      })
      .catch(() => {})
  }, [activity?.operatorId])

  const minGuests = Math.max(1, activity?.minimumNumberOfPeople ?? 1)
  const maxGuests = activity?.maximumNumberOfPeople ? Math.max(activity.maximumNumberOfPeople, minGuests) : 30

  const handleBook = () => {
    if (!activity?.operatorId) return
    const qs = new URLSearchParams({
      activityId: activity.id,
      activityName: activity.activityName,
      date,
      guests: travelers.toString(),
      minGuests: minGuests.toString(),
      maxGuests: maxGuests.toString(),
      activityOperatorId: activity.operatorId,
    })
    router.push(`/booking/guest-info?${qs.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-gray-700 font-semibold">Activity not found.</p>
        <Link href="/activities" className="text-green-600 text-sm hover:underline">Back to Activities</Link>
      </div>
    )
  }

  const allImages = activity.activityImages.filter(Boolean)
  const heroImages = allImages.slice(0, 3)

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + ((r as ApprovedReview & { rating?: number }).rating ?? 5), 0) / reviews.length
    : activity.activityRating

  const categoryBreakdown = [
    { label: 'Guide',    score: Math.min(5, +Math.max(1, avgRating + 0.3).toFixed(1)) },
    { label: 'Value',    score: Math.min(5, +Math.max(1, avgRating - 0.1).toFixed(1)) },
    { label: 'Safety',   score: Math.min(5, +Math.max(1, avgRating + 0.1).toFixed(1)) },
    { label: 'Fun',      score: Math.min(5, +Math.max(1, avgRating      ).toFixed(1)) },
  ]

  const filteredReviews = reviewFilter === 'all'
    ? reviews
    : reviews.filter((r) => Math.round(((r as ApprovedReview & { rating?: number }).rating ?? 5)) === parseInt(reviewFilter))

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1">

        {/* ── Hero ── */}
        <div className="bg-[#f8faf8] border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-7 overflow-hidden">
              <Link href="/" className="hover:text-green-600 shrink-0">Home</Link>
              <span className="shrink-0">›</span>
              <Link href="/activities" className="hover:text-green-600 shrink-0">Activities</Link>
              <span className="shrink-0">›</span>
              <Link href="/locations" className="hover:text-green-600 shrink-0">{activity.activityLocation}</Link>
              <span className="shrink-0">›</span>
              <span className="text-gray-600 font-medium truncate">{activity.activityName}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Left: Text */}
              <div className="order-2 lg:order-1">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {activity.activityTag && (
                    <span className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      ★ {activity.activityTag}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Free cancellation
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-gray-900 leading-[1.05] tracking-tight mb-5">
                  {activity.activityName}
                </h1>

                <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-7 max-w-lg line-clamp-3">
                  {activity.activityDetails}
                </p>

                <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <StarRating rating={activity.activityRating} />
                    <span className="font-bold text-gray-900">{activity.activityRating.toFixed(1)}</span>
                    {reviews.length > 0 && <span className="text-gray-400">({reviews.length.toLocaleString()})</span>}
                  </div>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {activity.activityLocation}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                    English, Filipino
                  </span>
                </div>
              </div>

              {/* Right: Stacked photo cards */}
              <div className="order-1 lg:order-2 flex items-center justify-center py-4 lg:py-0">
                <div className="relative w-[380px] h-[380px] sm:w-[420px] sm:h-[420px]">
                  <button
                    type="button"
                    onClick={() => heroImages[0] && setLightboxIdx(0)}
                    className="absolute top-7 right-0 z-[1] w-[255px] h-[255px] sm:w-[275px] sm:h-[275px] rounded-[22px] overflow-hidden shadow-lg bg-gray-200 [transform:rotate(-5deg)] hover:z-[10] hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-zoom-in"
                  >
                    {heroImages[0] && <Image src={heroImages[0]} alt="" fill className="object-cover" sizes="275px" />}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
                    <div className="absolute bottom-3 left-3 bg-gray-900/70 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide max-w-[80%] truncate">
                      {activity.activityLocation.toUpperCase()}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => heroImages[1] && setLightboxIdx(1)}
                    className="absolute bottom-8 left-0 z-[2] w-[248px] h-[248px] sm:w-[265px] sm:h-[265px] rounded-[22px] overflow-hidden shadow-xl bg-gray-200 hover:z-[10] hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-zoom-in"
                  >
                    {heroImages[1] && <Image src={heroImages[1]} alt="" fill className="object-cover" sizes="265px" />}
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
                    <div className="absolute bottom-3 left-3 bg-gray-900/70 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide max-w-[80%] truncate">
                      {activity.activityTag.toUpperCase()}
                    </div>
                  </button>

                  {heroImages[2] && (
                    <button
                      type="button"
                      onClick={() => setLightboxIdx(2)}
                      className="absolute bottom-0 right-4 z-[3] w-[140px] h-[140px] sm:w-[155px] sm:h-[155px] rounded-[18px] overflow-hidden shadow-xl bg-gray-200 hover:z-[10] hover:scale-110 hover:shadow-2xl transition-all duration-300 cursor-zoom-in"
                    >
                      <Image src={heroImages[2]} alt="" fill className="object-cover" sizes="155px" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-200" />
                      <div className="absolute bottom-3 left-3 bg-gray-900/70 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide max-w-[90%] truncate">
                        {activity.activityImages.length > 2 ? `${activity.activityImages.length} PHOTOS` : activity.activityLocation.toUpperCase()}
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className="border-b border-gray-100 bg-white overflow-x-auto scrollbar-hide">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-stretch divide-x divide-gray-100 min-w-max lg:min-w-0">
              {[
                { label: 'Location',   value: activity.activityLocation },
                { label: 'Group size', value: `Up to ${maxGuests}` },
                { label: 'Category',   value: activity.activityTag },
                { label: 'From',       value: `₱${activity.pricePerGuest.toLocaleString()} / pax` },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 px-6 py-4 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main content + sidebar ── */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 pb-28 lg:pb-12">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">

            {/* ── Left content ── */}
            <div className="flex-1 min-w-0">

              {/* 01 About this activity */}
              <SectionBlock num="01" title="About this activity">
                {operatorName && activity.operatorId && (
                  <Link
                    href={`/operators/${activity.operatorId}`}
                    className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium hover:underline mb-5"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    {operatorName}
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                  {activity.activityDetails}
                </p>
              </SectionBlock>

              {/* 02 Reviews */}
              <SectionBlock num="02" title={`Reviews · ${avgRating.toFixed(1)}★`}>
                <div className="flex flex-col sm:flex-row gap-8 mb-8">
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="text-6xl font-extrabold text-gray-900 leading-none">{avgRating.toFixed(1)}</span>
                    <StarRating rating={avgRating} />
                    <span className="text-xs text-gray-400 mt-1">Based on {reviews.length} rating{reviews.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-3.5 min-w-0">
                    {categoryBreakdown.map(({ label, score }) => (
                      <div key={label} className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 w-16 shrink-0">{label}</span>
                        <progress value={score} max={5} className="category-bar flex-1" />
                        <span className="text-sm font-semibold text-gray-800 w-7 text-right shrink-0">{score.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  {(['all', '5', '4', '3'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setReviewFilter(f)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${reviewFilter === f ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                    >
                      {f === 'all' ? 'All' : `${f}★`}
                    </button>
                  ))}
                </div>

                {filteredReviews.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No reviews yet — be one of the first!</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredReviews.slice(0, reviewsVisible).map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
                {reviewsVisible < filteredReviews.length && (
                  <button type="button" onClick={() => setReviewsVisible((v) => v + 6)} className="mt-5 text-sm font-semibold text-green-600 hover:underline">
                    Show more reviews
                  </button>
                )}
                <p className="mt-4 text-xs text-gray-400">
                  Had a great experience? <span className="text-green-600 font-medium">Book to leave a review →</span>
                </p>
              </SectionBlock>

              {/* 03 Frequently asked */}
              <SectionBlock num="03" title="Frequently asked">
                <div className="border-t border-gray-100">
                  {STATIC_FAQS.map((faq, i) => (
                    <div key={i} className="border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between py-4 text-left"
                      >
                        <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                        <span className="text-gray-400 ml-4 shrink-0">
                          {openFaq === i ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </span>
                      </button>
                      {openFaq === i && (
                        <p className="pb-4 text-sm text-gray-500 leading-relaxed pr-8">{faq.a}</p>
                      )}
                    </div>
                  ))}
                </div>
              </SectionBlock>
            </div>

            {/* ── Right sidebar (desktop) ── */}
            <div className="hidden lg:block w-80 shrink-0">
              <div className="sticky top-8">
                <div className="bg-white rounded-2xl shadow-[0_2px_24px_rgba(0,0,0,0.10)] ring-1 ring-gray-100 p-6">
                  <div className="mb-5">
                    <p className="text-xs text-gray-400 mb-0.5">From</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-gray-900">₱{activity.pricePerGuest.toLocaleString()}</span>
                      <span className="text-gray-400 text-sm">per adult · taxes included</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold mt-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Free cancel
                    </span>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="act-date-desktop" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
                    <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 gap-3 bg-gray-50">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <input id="act-date-desktop" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                        className="outline-none text-sm text-gray-700 flex-1 bg-transparent [color-scheme:light]" />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Travelers (10+)</label>
                    <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                      <button type="button" onClick={() => setTravelers((t) => Math.max(minGuests, t - 1))}
                        className="w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-500 flex items-center justify-center transition-colors text-lg leading-none">−</button>
                      <span className="text-sm font-semibold text-gray-800">{travelers}</span>
                      <button type="button" onClick={() => setTravelers((t) => Math.min(maxGuests, t + 1))}
                        className="w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-500 flex items-center justify-center transition-colors text-lg leading-none">+</button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mb-5 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>{travelers} adults × ₱{activity.pricePerGuest.toLocaleString()}</span>
                      <span>₱{(activity.pricePerGuest * travelers).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-base">
                      <span>Total</span>
                      <span>₱{(activity.pricePerGuest * travelers).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleBook}
                    className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-3.5 rounded-full transition-all text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    Reserve now →
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-3">Reserve now · pay nothing today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {lightboxIdx !== null && (
        <Lightbox
          images={allImages}
          idx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onChange={setLightboxIdx}
        />
      )}

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 leading-none mb-0.5">Price per guest</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-gray-900">₱{activity.pricePerGuest.toLocaleString()}</span>
            <span className="text-xs text-gray-400">/ person</span>
          </div>
        </div>
        <button
          onClick={() => setBookingDrawerOpen(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold px-5 py-3 rounded-full text-sm transition-all shadow-md shrink-0"
        >
          Book This Activity
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>

      {/* Mobile booking drawer */}
      <Drawer open={bookingDrawerOpen} onOpenChange={setBookingDrawerOpen}>
        <DrawerContent className="pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">Reserve Your Spot</DrawerTitle>
            <DrawerDescription className="text-gray-500 text-sm truncate">{activity.activityName}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 space-y-4">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-extrabold text-gray-900">₱{activity.pricePerGuest.toLocaleString()}</span>
              <span className="text-sm text-gray-400">/ person</span>
            </div>
            <div>
              <label htmlFor="act-date-mobile" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 gap-3 bg-gray-50">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input id="act-date-mobile" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="outline-none text-sm text-gray-700 flex-1 bg-transparent [color-scheme:light]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Travelers</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 gap-3 bg-gray-50 justify-between">
                <button type="button" onClick={() => setTravelers((t) => Math.max(minGuests, t - 1))}
                  className="w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-500 flex items-center justify-center transition-colors text-lg leading-none">−</button>
                <span className="text-sm font-semibold text-gray-800">{travelers} {travelers === 1 ? 'guest' : 'guests'}</span>
                <button type="button" onClick={() => setTravelers((t) => Math.min(maxGuests, t + 1))}
                  className="w-7 h-7 rounded-full border border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-500 flex items-center justify-center transition-colors text-lg leading-none">+</button>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>₱{activity.pricePerGuest.toLocaleString()} × {travelers}</span>
                <span>₱{(activity.pricePerGuest * travelers).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-base">
                <span>Total</span>
                <span>₱{(activity.pricePerGuest * travelers).toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => { setBookingDrawerOpen(false); handleBook() }}
              className="w-full bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold py-4 rounded-full transition-all shadow-md flex items-center justify-center gap-2 text-sm"
            >
              Confirm & Continue →
            </button>
            <p className="text-center text-xs text-gray-400">No charges yet — review before paying</p>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export default function ActivityDetail() {
  return (
    <Suspense>
      <ActivityDetailInner />
    </Suspense>
  )
}

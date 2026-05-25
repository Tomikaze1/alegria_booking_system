'use client'

import { useState, useEffect, Suspense, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Footer from '@/app/components/Footer'
import SearchBar from '@/app/components/SearchBar'
import ActivityCard from '@/app/components/ActivityCard'
import PackageCard from '@/app/components/ui/PackageCard'
import { useSearchParams } from 'next/navigation'
import { parseGuestListingSearchParams } from '@/app/lib/searchSchema'
import { getDayCapacity } from '@/app/lib/getDayCapacity'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { firebaseDb } from '@/app/lib/firebase'
import { ACTIVITY_TAGS } from '@/app/lib/activity-tags'
import type { Activity } from '@/app/types'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/app/components/ui/drawer'
import { SlidersHorizontal, ChevronRight, Star, X } from 'lucide-react'

export default function ActivitiesPage() {
  return (
    <Suspense>
      <ActivitiesContent />
    </Suspense>
  )
}

// ── Price Range Slider ────────────────────────────────────────────────────────

function PriceRangeSlider({ min, max, value, onChange }: {
  min: number
  max: number
  value: [number, number]
  onChange: (v: [number, number]) => void
}) {
  const [lo, hi] = value
  const range = max - min || 1
  const loPercent = ((lo - min) / range) * 100
  const hiPercent = ((hi - min) / range) * 100
  const step = Math.max(1, Math.ceil((max - min) / 100))
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = fillRef.current
    if (!el) return
    el.style.left = `${loPercent}%`
    el.style.right = `${100 - hiPercent}%`
  }, [loPercent, hiPercent])

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>₱{lo.toLocaleString()}</span>
        <span>₱{hi.toLocaleString()}</span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1 bg-gray-200 rounded-full pointer-events-none" />
        <div
          ref={fillRef}
          className="absolute h-1 bg-green-500 rounded-full pointer-events-none"
        />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi - step), hi])}
          className="dual-range"
          aria-label="Minimum price"
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + step)])}
          className="dual-range"
          aria-label="Maximum price"
        />
      </div>
    </div>
  )
}

// ── Filter Sidebar Content ────────────────────────────────────────────────────

function FilterSidebarContent({
  priceRange, onPriceChange, globalMin, globalMax,
  minRating, onRatingChange,
  selectedLocations, onLocationsChange,
  locationCounts, onClearAll,
}: {
  priceRange: [number, number]
  onPriceChange: (v: [number, number]) => void
  globalMin: number
  globalMax: number
  minRating: number | null
  onRatingChange: (r: number | null) => void
  selectedLocations: string[]
  onLocationsChange: (l: string[]) => void
  locationCounts: [string, number][]
  onClearAll: () => void
}) {
  const hasFilters =
    minRating !== null ||
    selectedLocations.length > 0 ||
    priceRange[0] > globalMin ||
    priceRange[1] < globalMax

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <h3 className="font-semibold text-gray-900 text-sm">Filters</h3>
        {hasFilters && (
          <button type="button" onClick={onClearAll} className="text-xs text-green-600 font-medium hover:underline">
            Clear all
          </button>
        )}
      </div>

      {/* Price */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Price</p>
        <PriceRangeSlider
          min={globalMin} max={globalMax}
          value={priceRange}
          onChange={onPriceChange}
        />
      </div>

      {/* Rating */}
      <div className="border-t border-gray-100 pt-4 mt-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Rating</p>
        <div className="space-y-0.5">
          {([5, 4.5, 4, 3] as number[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRatingChange(minRating === r ? null : r)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-colors ${
                minRating === r ? 'bg-green-50 text-green-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {r}★ &amp; up
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      {locationCounts.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Location</p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-hide">
            {locationCounts.map(([loc, count]) => (
              <label key={loc} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(loc)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selectedLocations, loc]
                      : selectedLocations.filter((l) => l !== loc)
                    onLocationsChange(next)
                  }}
                  className="rounded border-gray-300 accent-green-500 w-4 h-4 shrink-0"
                  aria-label={loc}
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1 truncate">{loc}</span>
                <span className="text-xs text-gray-400 tabular-nums">{count}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ActivitiesContent() {
  const searchParams = useSearchParams()
  const queryKey = searchParams.toString()
  const initialSearch = parseGuestListingSearchParams(searchParams)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const tagScrollRef = useRef<HTMLDivElement>(null)
  const [searchLocation, setSearchLocation] = useState(initialSearch.location)
  const [searchDate, setSearchDate] = useState(initialSearch.date)
  const [searchTravelers, setSearchTravelers] = useState(initialSearch.travelers)
  const [visibleCount, setVisibleCount] = useState(8)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [dayCapacity, setDayCapacity] = useState<Record<string, number | null>>({})
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [popularPackages, setPopularPackages] = useState<{
    id: string; packageName: string; packageDescription: string;
    pricePerPerson: number; packageLocation: string; duration: string;
    packageTag: string; packageImages: string[]; packageRating: number; slug: string;
  }[]>([])

  // ── Sidebar filter state ──────────────────────────────────────────
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 999999])
  const [minRating, setMinRating] = useState<number | null>(null)
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const boundsInitRef = useRef(false)

  useEffect(() => {
    const p = parseGuestListingSearchParams(new URLSearchParams(queryKey))
    setSearchLocation(p.location)
    setSearchDate(p.date)
    setSearchTravelers(p.travelers)
  }, [queryKey])

  useEffect(() => {
    async function fetchActivities() {
      try {
        const q = query(
          collection(firebaseDb, 'activities'),
          where('status', '==', 'active'),
        )
        const snap = await getDocs(q)
        const mapped: Activity[] = snap.docs.map((d, idx) => {
          const data = d.data()
          return {
            id: idx,
            firestoreId: d.id,
            category: data.activityTag ?? '',
            title: data.activityName ?? '',
            location: data.activityLocation ?? '',
            rating: data.activityRating ?? 0,
            reviewCount: 0,
            price: data.pricePerGuest ?? 0,
            maxGuests: data.maximumNumberOfPeople ?? data.maxSlots ?? 30,
            image: data.activityImages?.[0] ?? '',
            municipalityId: data.activityLocation ?? '',
          }
        })
        setActivities(mapped)
      } catch (err) {
        console.error('Failed to fetch activities:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()

    async function fetchPopularPackages() {
      try {
        const snap = await getDocs(query(collection(firebaseDb, 'tourPackages'), where('status', '==', 'active'), limit(2)))
        setPopularPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as typeof popularPackages[0])))
      } catch { /* ignore */ }
    }
    fetchPopularPackages()
  }, [])

  // Initialize price range to actual data bounds (once)
  useEffect(() => {
    if (boundsInitRef.current || activities.length === 0) return
    const prices = activities.map((a) => a.price).filter((p) => p > 0)
    if (prices.length) {
      boundsInitRef.current = true
      setPriceRange([Math.min(...prices), Math.max(...prices)])
    }
  }, [activities])

  useEffect(() => {
    const normalizedDate = searchDate.trim()
    if (!normalizedDate) { setDayCapacity({}); return }
    const sourceIds = activities.map((a) => a.firestoreId).filter((id): id is string => !!id)
    getDayCapacity(sourceIds, normalizedDate)
      .then(setDayCapacity)
      .catch((err) => { console.error('Failed to load activity day capacity:', err); setDayCapacity({}) })
  }, [activities, searchDate])

  const globalMin = useMemo(() => {
    const prices = activities.map((a) => a.price).filter((p) => p > 0)
    return prices.length ? Math.min(...prices) : 0
  }, [activities])

  const globalMax = useMemo(() => {
    const prices = activities.map((a) => a.price).filter((p) => p > 0)
    return prices.length ? Math.max(...prices) : 999999
  }, [activities])

  const locationCounts = useMemo(() => {
    const map = new Map<string, number>()
    activities.forEach((a) => {
      if (a.location) map.set(a.location, (map.get(a.location) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [activities])

  const filtered = useMemo(() => activities.filter((a) => {
    const matchesTag = !activeFilter || a.category === activeFilter
    const matchesLocation = !searchLocation || a.location.toLowerCase().includes(searchLocation.toLowerCase())
    const requestedTravelers = Math.max(1, Number.parseInt(searchTravelers || '1', 10) || 1)
    const slotsAvailable = a.firestoreId ? dayCapacity[a.firestoreId] : null
    const effectiveCapacity = slotsAvailable ?? (a.maxGuests ?? 30)
    const matchesAvailability = !searchDate || effectiveCapacity >= requestedTravelers
    const matchesPrice = a.price === 0 || (a.price >= priceRange[0] && a.price <= priceRange[1])
    const matchesRating = minRating === null || a.rating >= minRating
    const matchesSidebarLocation = selectedLocations.length === 0 || selectedLocations.includes(a.location)
    return matchesTag && matchesLocation && matchesAvailability && matchesPrice && matchesRating && matchesSidebarLocation
  }), [activities, activeFilter, searchLocation, searchDate, searchTravelers, dayCapacity, priceRange, minRating, selectedLocations])

  const visible = filtered.slice(0, visibleCount)

  const activeSidebarFilterCount = [
    minRating !== null,
    selectedLocations.length > 0,
    priceRange[0] > globalMin || priceRange[1] < globalMax,
  ].filter(Boolean).length

  function clearAllFilters() {
    setMinRating(null)
    setSelectedLocations([])
    setPriceRange([globalMin, globalMax])
  }

  const sidebarProps = {
    priceRange, onPriceChange: setPriceRange,
    globalMin, globalMax,
    minRating, onRatingChange: setMinRating,
    selectedLocations, onLocationsChange: setSelectedLocations,
    locationCounts, onClearAll: clearAllFilters,
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative w-full h-[clamp(180px,25vw,280px)]">
          <Image
            src="https://picsum.photos/seed/cebu-activities/1400/500"
            alt="Activities in Cebu"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="absolute top-0 left-0 px-8 md:px-16 pt-5">
          <nav className="text-white/80 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/locations" className="hover:text-white transition-colors">Cebu Locations</Link>
            <span className="mx-2">›</span>
            <span className="text-white font-medium">Activities</span>
          </nav>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-white font-extrabold text-3xl sm:text-5xl md:text-6xl drop-shadow-lg tracking-wide mb-3">
            Activities
          </h1>
          <p className="text-white/80 text-sm sm:text-lg max-w-xl">
            Explore the best adventures Cebu has to offer
          </p>
        </div>
      </section>

      {/* Desktop search bar */}
      <div className="relative z-30 -mt-8 px-4 sm:px-6 md:px-16 mb-4 hidden sm:block">
        <SearchBar
          className="max-w-4xl mx-auto"
          defaultWhere={searchLocation}
          defaultWhen={searchDate}
          defaultTravelers={searchTravelers}
          onSearch={({ where, when, travelers }) => {
            setSearchLocation(where); setSearchDate(when); setSearchTravelers(travelers); setVisibleCount(8)
          }}
        />
      </div>

      {/* Mobile search drawer */}
      <Drawer open={searchDrawerOpen} onOpenChange={setSearchDrawerOpen}>
        <DrawerContent className="pb-8">
          <DrawerHeader>
            <DrawerTitle>Search Activities</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <SearchBar
              defaultWhere={searchLocation}
              defaultWhen={searchDate}
              defaultTravelers={searchTravelers}
              onSearch={({ where, when, travelers }) => {
                setSearchLocation(where); setSearchDate(when); setSearchTravelers(travelers)
                setVisibleCount(8); setSearchDrawerOpen(false)
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile filter drawer */}
      <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DrawerContent className="pb-0 max-h-[90vh] flex flex-col">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Filters</DrawerTitle>
          </DrawerHeader>
          <div className="px-5 overflow-y-auto flex-1">
            <FilterSidebarContent {...sidebarProps} />
          </div>
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(false)}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Sticky category + filter bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-2">

            {/* Mobile: Filters button */}
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              className={`lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap shrink-0 ${
                activeSidebarFilterCount > 0
                  ? 'border-green-500 text-green-700 bg-green-50 font-medium'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
              Filters
              {activeSidebarFilterCount > 0 && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                  {activeSidebarFilterCount}
                </span>
              )}
            </button>

            {activeSidebarFilterCount > 0 && (
              <div className="h-6 w-px bg-gray-200 shrink-0 lg:hidden" />
            )}

            {/* Category pills */}
            <div ref={tagScrollRef} className="flex items-center gap-2 overflow-x-auto flex-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  activeFilter === null
                    ? 'bg-green-500 text-white border-green-500'
                    : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
                }`}
              >
                All
              </button>
              {ACTIVITY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === tag ? null : tag)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    activeFilter === tag
                      ? 'bg-green-500 text-white border-green-500'
                      : 'border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-label="Scroll categories right"
              onClick={() => tagScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
              className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 bg-white shadow-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-16 gap-6">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <FilterSidebarContent {...sidebarProps} />
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="bg-green-500 text-white text-sm font-semibold py-2.5 rounded-xl text-center">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0">
          {/* Result count + active filter chips */}
          <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
            <p className="text-sm text-gray-500 pt-1">
              <span className="font-semibold text-gray-800">{filtered.length}</span> activities
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {minRating !== null && (
                <button
                  type="button"
                  onClick={() => setMinRating(null)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200"
                >
                  {minRating}★ &amp; up <X className="w-3 h-3" />
                </button>
              )}
              {selectedLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setSelectedLocations((prev) => prev.filter((l) => l !== loc))}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200"
                >
                  {loc} <X className="w-3 h-3" />
                </button>
              ))}
              {(priceRange[0] > globalMin || priceRange[1] < globalMax) && (
                <button
                  type="button"
                  onClick={() => setPriceRange([globalMin, globalMax])}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200"
                >
                  ₱{priceRange[0].toLocaleString()}–₱{priceRange[1].toLocaleString()} <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading activities…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">No activities match your filters.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 mb-8 items-stretch">
              {visible.map((act) => (
                <ActivityCard key={act.id} activity={act} date={searchDate} travelers={searchTravelers} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mb-16">
            {visibleCount < filtered.length && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 8)}
                className="border border-gray-300 text-gray-700 px-10 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Show more
              </button>
            )}
            {visibleCount > 8 && (
              <button
                type="button"
                onClick={() => setVisibleCount(8)}
                className="border border-gray-300 text-gray-700 px-10 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Show less
              </button>
            )}
          </div>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Popular Tour Packages</h2>
              <Link href="/tour-packages" className="text-sm text-green-600 font-medium hover:underline">See more</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {popularPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  image={pkg.packageImages?.[0] ?? ''}
                  title={pkg.packageName}
                  description={pkg.packageDescription}
                  price={pkg.pricePerPerson}
                  pricePrefix="Starting from"
                  tag={pkg.packageTag}
                  duration={pkg.duration}
                  rating={pkg.packageRating}
                  cardKind="tourPackage"
                  href={`/tour-packages/${pkg.slug}`}
                  wide
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Mobile floating search button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden">
        <button
          type="button"
          onClick={() => setSearchDrawerOpen(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          Search
        </button>
      </div>

      <Footer />
    </div>
  )
}

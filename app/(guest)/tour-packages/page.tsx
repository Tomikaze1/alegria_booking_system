'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Footer from '@/app/components/Footer'
import SearchBar from '@/app/components/SearchBar'
import PackageCard from '@/app/components/ui/PackageCard'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { firebaseDb } from '@/app/lib/firebase'
import { CategoryFilterCollapsible } from '@/app/components/CategoryFilterCollapsible'
import { ACTIVITY_TAGS } from '@/app/lib/activity-tags'
import { parseGuestListingSearchParams } from '@/app/lib/searchSchema'
import { getDayCapacity } from '@/app/lib/getDayCapacity'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/app/components/ui/drawer'

interface FirestorePackage {
  id: string
  packageName: string
  packageDescription: string
  pricePerPerson: number
  minimumNumberOfPeople: number
  maximumNumberOfPeople?: number
  packageLocation: string
  duration: string
  packageTag: string
  packageImages: string[]
  packageRating: number
  slug: string
}

const INITIAL_COUNT = 9

export default function TourPackagesPage() {
  return (
    <Suspense>
      <TourPackagesContent />
    </Suspense>
  )
}

function TourPackagesContent() {
  const searchParams = useSearchParams()
  const queryKey = searchParams.toString()
  const initialSearch = parseGuestListingSearchParams(searchParams)
  const [packages, setPackages] = useState<FirestorePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [dayCapacity, setDayCapacity] = useState<Record<string, number | null>>({})
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [searchWhere, setSearchWhere] = useState(initialSearch.location)
  const [searchDate, setSearchDate] = useState(initialSearch.date)
  const [searchTravelers, setSearchTravelers] = useState(initialSearch.travelers)
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [popularActivities, setPopularActivities] = useState<{
    id: string; activityName: string; activityTag: string;
    activityLocation: string; activityRating: number;
    pricePerGuest: number; activityImages: string[];
  }[]>([])
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const p = parseGuestListingSearchParams(new URLSearchParams(queryKey))
    setSearchWhere(p.location)
    setSearchDate(p.date)
    setSearchTravelers(p.travelers)
    setVisibleCount(INITIAL_COUNT)
  }, [queryKey])

  useEffect(() => {
    getDocs(query(
      collection(firebaseDb, 'tourPackages'),
      where('status', '==', 'active'),
    )).then((snap) => {
      setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestorePackage)))
      setLoading(false)
    }).catch(() => setLoading(false))

    async function fetchActivities() {
      try {
        const snap = await getDocs(query(collection(firebaseDb, 'activities'), where('status', '==', 'active'), limit(7)))
        setPopularActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() } as typeof popularActivities[0])))
      } catch { /* ignore */ }
    }
    fetchActivities()
  }, [])

  useEffect(() => {
    const normalizedDate = searchDate.trim()
    if (!normalizedDate) {
      setDayCapacity({})
      return
    }
    const sourceIds = packages.map((pkg) => pkg.id).filter(Boolean)
    getDayCapacity(sourceIds, normalizedDate)
      .then(setDayCapacity)
      .catch((err) => {
        console.error('Failed to load package day capacity:', err)
        setDayCapacity({})
      })
  }, [packages, searchDate])

  const filtered = useMemo(() => packages.filter((p) => {
    const matchesTag = !activeFilter || p.packageTag === activeFilter
    const term = searchWhere.trim().toLowerCase()
    const matchesSearch = !term ||
      p.packageName.toLowerCase().includes(term) ||
      p.packageLocation.toLowerCase().includes(term)
    const requestedTravelers = Math.max(1, Number.parseInt(searchTravelers || '1', 10) || 1)
    const slotsAvailable = dayCapacity[p.id]
    const fallbackCapacity = Math.max(
      p.minimumNumberOfPeople ?? 1,
      p.maximumNumberOfPeople ?? 30,
    )
    const effectiveCapacity = slotsAvailable ?? fallbackCapacity
    const matchesAvailability = !searchDate || effectiveCapacity >= requestedTravelers
    return matchesTag && matchesSearch && matchesAvailability
  }), [packages, activeFilter, searchWhere, searchDate, searchTravelers, dayCapacity])

  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <section className="relative overflow-hidden">
        <div className="relative w-full h-[clamp(180px,25vw,280px)]">
          <Image
            src="https://picsum.photos/seed/cebu-packages/1400/500"
            alt="Tour Packages"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="absolute top-0 left-0 px-4 sm:px-8 md:px-16 pt-5">
          <nav className="text-white/80 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <span className="text-white font-medium">Tour Packages</span>
          </nav>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-white font-extrabold text-4xl sm:text-5xl md:text-6xl drop-shadow-lg tracking-wide mb-3">
            Tour Packages
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-xl">
            Curated adventures across the most beautiful spots in Cebu
          </p>
        </div>
      </section>

      {/* Desktop search bar */}
      <div className="relative z-30 -mt-8 mb-4 hidden px-4 sm:block sm:px-6 md:px-16">
        <SearchBar
          className="max-w-4xl mx-auto"
          defaultWhere={searchWhere}
          defaultWhen={searchDate}
          defaultTravelers={searchTravelers}
          onSearch={({ where, when, travelers }) => { setSearchWhere(where); setSearchDate(when); setSearchTravelers(travelers); setVisibleCount(INITIAL_COUNT) }}
        />
      </div>

      {/* Mobile search drawer */}
      <Drawer open={searchDrawerOpen} onOpenChange={setSearchDrawerOpen}>
        <DrawerContent className="pb-8">
          <DrawerHeader>
            <DrawerTitle>Search Tour Packages</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <SearchBar
              defaultWhere={searchWhere}
              defaultWhen={searchDate}
              defaultTravelers={searchTravelers}
              onSearch={({ where, when, travelers }) => {
                setSearchWhere(where)
                setSearchDate(when)
                setSearchTravelers(travelers)
                setVisibleCount(INITIAL_COUNT)
                setSearchDrawerOpen(false)
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <CategoryFilterCollapsible
          expanded={filterPanelOpen}
          onToggle={() => setFilterPanelOpen((o) => !o)}
          activeSummary={activeFilter}
        >
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className={`border px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === null ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {ACTIVITY_TAGS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === cat
                  ? 'bg-green-500 text-white border border-green-500'
                  : 'border border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </CategoryFilterCollapsible>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="text-sm text-gray-400 py-20 text-center">Loading packages…</div>
        ) : visible.length === 0 ? (
          <div className="text-sm text-gray-400 py-20 text-center">
            {packages.length === 0 ? 'No tour packages available yet.' : 'No packages match your search.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5 mb-8 items-stretch">
            {visible.map((pkg) => (
              <PackageCard
                key={pkg.id}
                image={pkg.packageImages?.[0] ?? ''}
                title={pkg.packageName}
                price={pkg.pricePerPerson}
                pricePrefix="Starting from"
                tag={pkg.packageTag}
                duration={pkg.duration}
                rating={pkg.packageRating}
                minGuests={pkg.minimumNumberOfPeople ?? 1}
                cardKind="tourPackage"
                href={(() => {
                  const params = new URLSearchParams()
                  if (searchDate) params.set('date', searchDate)
                  if (searchTravelers) params.set('travelers', searchTravelers)
                  const q = params.toString()
                  return `/tour-packages/${pkg.slug}${q ? `?${q}` : ''}`
                })()}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 mb-10">
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 6)}
              className="border border-gray-300 text-gray-700 px-10 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Show more
            </button>
          )}
          {visibleCount > INITIAL_COUNT && (
            <button
              onClick={() => setVisibleCount(INITIAL_COUNT)}
              className="border border-gray-300 text-gray-700 px-10 py-2.5 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Show less
            </button>
          )}
        </div>
      </main>

      {popularActivities.length > 0 && (
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Popular Activities</h2>
            <Link href="/activities" className="text-sm text-green-600 font-medium hover:underline">See more</Link>
          </div>
          <div className="relative">
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-md border border-gray-200 rounded-full p-2 hover:bg-gray-50 transition-colors hidden sm:flex"
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
            >
              {popularActivities.map((act) => (
                <div key={act.id} className="shrink-0 w-44 sm:w-52 snap-start">
                  <PackageCard
                    image={act.activityImages?.[0] ?? ''}
                    title={act.activityName}
                    price={act.pricePerGuest}
                    pricePrefix="From"
                    tag={act.activityTag}
                    rating={act.activityRating}
                    location={act.activityLocation}
                    cardKind="activity"
                  />
                </div>
              ))}
              <div className="shrink-0 w-44 sm:w-52 snap-start">
                <Link href="/activities" className="block h-full">
                  <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-green-500 flex flex-col items-center justify-center gap-3 group hover:bg-green-600 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    <p className="text-white font-bold text-sm text-center px-4">See All Activities</p>
                  </div>
                </Link>
              </div>
            </div>
            <button
              onClick={() => carouselRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-md border border-gray-200 rounded-full p-2 hover:bg-gray-50 transition-colors hidden sm:flex"
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      )}

      {/* Mobile floating search button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden">
        <button
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


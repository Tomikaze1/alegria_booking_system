'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where as firestoreWhere } from 'firebase/firestore'
import Footer from '@/app/components/Footer'
import { LocationOfferCounts } from '@/app/components/LocationOfferCounts'
import { GuestReviewCard } from '@/app/components/GuestReviewCard'
import { firebaseDb } from '@/app/lib/firebase'
import {
  countByActivityLocation,
  countByPackageLocation,
  allCebuMunicipalitiesAsLocations,
} from '@/app/lib/guest-location-list'
import { getHomepageCmsClient } from '@/app/lib/homepage-cms'
import { getAllApprovedReviewsForCatalog, type CatalogReview } from '@/app/lib/reviews-service'
import type { Location } from '@/app/types'

const INITIAL_COUNT = 10

export default function LocationsPage() {
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [locations, setLocations] = useState<Location[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [reviews, setReviews] = useState<CatalogReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const [actSnap, pkgSnap, cms] = await Promise.all([
          getDocs(query(collection(firebaseDb, 'activities'), firestoreWhere('status', '==', 'active'))),
          getDocs(query(collection(firebaseDb, 'tourPackages'), firestoreWhere('status', '==', 'active'))),
          getHomepageCmsClient(),
        ])
        const activityByMuni = countByActivityLocation(actSnap)
        const packageByMuni = countByPackageLocation(pkgSnap)

        const publishedCmsItems = cms.locations.items
          .filter((item) => item.published)
          .sort((a, b) => a.order - b.order)

        if (publishedCmsItems.length > 0) {
          setLocations(
            publishedCmsItems.map((item) => ({
              id: item.municipalitySlug,
              name: item.displayName,
              image: item.imageUrl,
              activityCount: activityByMuni.get(item.displayName) ?? 0,
              packageCount: packageByMuni.get(item.displayName) ?? 0,
            })),
          )
        } else {
          setLocations(allCebuMunicipalitiesAsLocations(activityByMuni, packageByMuni))
        }
      } catch (e) {
        console.error('Failed to load locations list:', e)
        setLocations([])
      } finally {
        setListLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadReviews() {
      setReviewsLoading(true)
      try {
        const list = await getAllApprovedReviewsForCatalog()
        if (!cancelled) setReviews(list)
      } catch (e) {
        console.error('Failed to load reviews:', e)
        if (!cancelled) setReviews([])
      } finally {
        if (!cancelled) setReviewsLoading(false)
      }
    }
    loadReviews()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = locations.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  )
  const visible = filtered.slice(0, visibleCount)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <section className="relative overflow-hidden">
        <div className="relative w-full h-[clamp(180px,25vw,280px)]">
          <Image
            src="https://picsum.photos/seed/cebu-locations-hero/1400/500"
            alt="Explore Cebu"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        <div className="absolute top-0 left-0 px-8 md:px-16 pt-5">
          <nav className="text-white/80 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="mx-2">›</span>
            <span className="text-white font-medium">Cebu Locations</span>
          </nav>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-white font-extrabold text-3xl sm:text-5xl md:text-6xl drop-shadow-lg tracking-wide mb-3">
            Explore Cebu
          </h1>
          <p className="text-white/80 text-sm sm:text-lg max-w-xl">
            Discover stunning destinations across the island of Cebu
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 pb-16">
        <div className="flex items-center bg-white rounded-full shadow-md border border-gray-100 px-6 py-4 mb-10 max-w-2xl mx-auto mt-10">
          <svg className="w-5 h-5 text-gray-400 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            id="location-search"
            name="locationSearch"
            autoComplete="off"
            aria-label="Search locations in Cebu"
            placeholder="Search locations in Cebu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="outline-none text-sm text-gray-700 placeholder-gray-400 flex-1 bg-transparent"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 mb-8">
          {listLoading ? (
            <div className="col-span-full h-48 flex items-center justify-center text-sm text-gray-500">Loading locations…</div>
          ) : visible.length === 0 ? (
            <div className="col-span-full h-48 flex items-center justify-center text-sm text-gray-500 text-center px-4">
              No locations found.
            </div>
          ) : (
            visible.map((loc) => (
              <div
                key={loc.id}
                className="relative rounded-2xl overflow-hidden cursor-pointer group h-36"
                onClick={() => router.push(`/locations/${loc.id}`)}
              >
                {loc.image ? (
                  <Image
                    src={loc.image}
                    alt={loc.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-green-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-bold text-sm">{loc.name}</h3>
                  <LocationOfferCounts
                    activityCount={loc.activityCount}
                    packageCount={loc.packageCount}
                    className="mt-0.5"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mb-16">
          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount((c) => c + 10)}
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

        <section>
          <h2 className="text-2xl font-bold text-green-600 mb-2 text-center">Traveler&apos;s experience in Cebu</h2>
          <p className="text-sm text-gray-500 text-center mb-8 max-w-2xl mx-auto">
            Reviews from guests across activities and tour packages (published reviews only).
          </p>
          {reviewsLoading ? (
            <div className="text-sm text-gray-500 py-16 text-center">Loading reviews…</div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12 italic">No reviews yet – be one of the first to book and leave feedback!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((r) => (
                <GuestReviewCard key={r.id} review={r} itemTitle={r.itemTitle} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}


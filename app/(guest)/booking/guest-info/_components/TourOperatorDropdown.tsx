"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin, ChevronDown, Lock, Check, Search, User } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { firestore, firebaseStorage } from "@/app/lib/firebase";

interface TourOperatorDropdownProps {
    value: string;
    onChange: (val: string) => void;
    lockedByPromo?: boolean;
    lockReason?: "promo" | "source";
}

interface TourOperatorOption {
    uid: string;
    label: string;
    initials: string;
    imageUrl: string | null;
}

export const TourOperatorDropdown = ({ value, onChange, lockedByPromo = false, lockReason = "promo" }: TourOperatorDropdownProps) => {
    const [operators, setOperators] = useState<TourOperatorOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const snap = await getDocs(
                    query(
                        collection(firestore, "users"),
                        where("role", "==", "operator"),
                        where("status", "==", "active")
                    )
                );
                if (cancelled) return;

                type OperatorBase = TourOperatorOption & { storagePath: string | null }

                const base: OperatorBase[] = snap.docs
                    .flatMap((d) => {
                        const data = d.data() as {
                            companyName?: string;
                            profileImage?: string;
                        };
                        const label = data.companyName?.trim();
                        if (!label) return [] as OperatorBase[];
                        const words = label.split(/\s+/).filter(Boolean);
                        const initials = words.length >= 2
                            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
                            : label.slice(0, 2).toUpperCase();
                        const raw = typeof data.profileImage === 'string' ? data.profileImage.trim() : '';
                        // Only accept absolute URLs — relative paths (e.g. "signup-requests/UUID/photo.jpg")
                        // must go through getDownloadURL to become valid https:// URLs
                        const imageUrl = raw.startsWith('http') ? raw : null;
                        const storagePath = !raw.startsWith('http') && raw ? raw : null;
                        return [{ uid: d.id, label, initials, imageUrl, storagePath }];
                    })
                    .sort((a, b) => a.label.localeCompare(b.label));

                const withImages = await Promise.all(
                    base.map(async (op): Promise<TourOperatorOption> => {
                        if (op.imageUrl) return op;
                        // Use the actual Firestore storage path if available, else fall back to default location
                        const path = op.storagePath ?? `profile-pictures/${op.uid}.jpg`;
                        try {
                            const url = await getDownloadURL(ref(firebaseStorage, path));
                            return { uid: op.uid, label: op.label, initials: op.initials, imageUrl: url };
                        } catch {
                            return { uid: op.uid, label: op.label, initials: op.initials, imageUrl: null };
                        }
                    })
                );
                if (!cancelled) setOperators(withImages);
            } catch {
                if (!cancelled) setOperators([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (open) searchRef.current?.focus();
    }, [open]);

    const selectedOperator = operators.find((o) => o.uid === value);
    const filtered = operators.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-gray-500" />
                </div>
                <h2 className="text-lg font-semibold text-black">Tour Operator</h2>
                <span className="text-xs text-gray-400 font-medium uppercase">(Optional)</span>
                {lockedByPromo && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#74C00F] bg-[#74C00F]/10 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        {lockReason === "source" ? "Set by item owner" : "Set by promo"}
                    </span>
                )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
                {lockedByPromo
                    ? lockReason === "source"
                        ? "This operator is locked to the owner of the selected activity or tour package."
                        : "This operator is required by your promo code. Remove the promo in the order summary to choose a different operator."
                    : "Select a tour operator if you have a preferred guide"}
            </p>

            <div className="relative" ref={containerRef}>
                <button
                    type="button"
                    onClick={() => { if (!lockedByPromo && !loading) setOpen((p) => !p); }}
                    disabled={loading || lockedByPromo}
                    className={`w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-left transition-all ${
                        open ? "border-[#74C00F] ring-2 ring-[#74C00F]/20" : "border-gray-300 hover:border-gray-400"
                    } ${lockedByPromo ? "bg-gray-50 cursor-not-allowed opacity-90" : "bg-white cursor-pointer"}`}
                >
                    {selectedOperator ? (
                        <>
                            <div className="w-8 h-8 rounded-full bg-[#558B2F]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {selectedOperator.imageUrl ? (
                                    <Image src={selectedOperator.imageUrl} alt={selectedOperator.label} width={32} height={32} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold text-[#558B2F]">{selectedOperator.initials}</span>
                                )}
                            </div>
                            <span className="text-gray-800 font-medium truncate flex-1">{selectedOperator.label}</span>
                        </>
                    ) : (
                        <>
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-gray-400" />
                            </div>
                            <span className="text-gray-400 flex-1">
                                {loading ? "Loading operators..." : "Select tour operator"}
                            </span>
                        </>
                    )}
                    <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search operators..."
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#74C00F] focus:ring-1 focus:ring-[#74C00F]/20 transition bg-gray-50"
                                />
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto py-1">
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${!value ? "bg-[#74C00F]/5" : ""}`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-500 flex-1">No preference</span>
                                {!value && <Check className="w-4 h-4 text-[#74C00F] flex-shrink-0" />}
                            </button>

                            {filtered.length === 0 && search && (
                                <div className="px-4 py-6 text-center text-sm text-gray-400">
                                    No operators matching &ldquo;{search}&rdquo;
                                </div>
                            )}

                            {filtered.map((op) => (
                                <button
                                    key={op.uid}
                                    type="button"
                                    onClick={() => { onChange(op.uid); setOpen(false); setSearch(""); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${value === op.uid ? "bg-[#74C00F]/5" : ""}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#558B2F]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {op.imageUrl ? (
                                            <Image src={op.imageUrl} alt={op.label} width={32} height={32} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-[#558B2F]">{op.initials}</span>
                                        )}
                                    </div>
                                    <span className={`text-sm flex-1 truncate ${value === op.uid ? "text-gray-900 font-semibold" : "text-gray-700"}`}>
                                        {op.label}
                                    </span>
                                    {value === op.uid && <Check className="w-4 h-4 text-[#74C00F] flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

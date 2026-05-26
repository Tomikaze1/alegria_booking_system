"use client";

import React, { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { CountryDropdown } from "./CountryDropdown";
import { guestSchema } from "@/app/lib/schema";
import type { ZodIssue } from "zod";

interface Guest {
    name: string;
    age: string;
    gender: string;
    nationality: string;
    guestType: "adult" | "child";
}

interface GuestsListProps {
    guests: Guest[];
    onUpdateGuest: (index: number, field: string, value: string) => void;
    onAddGuest: () => void;
    onRemoveGuest: (index: number) => void;
    guestErrors?: Record<number, Partial<Record<string, string>>>;
    submitted?: boolean;
}

function validateGuestField(field: string, value: string): string | undefined {
    const defaults: Guest = { name: "A", age: "1", gender: "Male", nationality: "PH", guestType: "adult" };
    const result = guestSchema.safeParse({ ...defaults, [field]: value });
    if (result.success) return undefined;
    const issue = result.error.issues.find((i: ZodIssue) => i.path[0] === field);
    return issue?.message;
}

const FieldError = ({ message }: { message?: string }) =>
    message ? (
        <p role="alert" className="mt-1 text-xs text-red-500 font-medium flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {message}
        </p>
    ) : null;

const inputCls = (hasError: boolean) =>
    `w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 transition text-black placeholder:text-gray-300 ${
        hasError
            ? "border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50"
            : "border-gray-300 focus:ring-[#74C00F]/20 focus:border-[#74C00F]"
    }`;

interface GuestRowProps {
    idx: number;
    guest: Guest;
    onUpdate: (field: string, value: string) => void;
    onRemove: () => void;
    externalErrors?: Partial<Record<string, string>>;
    submitted: boolean;
}

const GuestRow = ({ idx, guest, onUpdate, onRemove, externalErrors = {}, submitted }: GuestRowProps) => {
    const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
    const [liveErrors, setLiveErrors] = useState<Partial<Record<string, string>>>({});

    const markTouched = useCallback((field: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    }, []);

    const handleBlur = useCallback((field: string, value: string) => {
        markTouched(field);
        setLiveErrors((prev) => ({ ...prev, [field]: validateGuestField(field, value) }));
    }, [markTouched]);

    const handleChange = useCallback((field: string, value: string) => {
        onUpdate(field, value);
        markTouched(field);
        setLiveErrors((prev) => ({ ...prev, [field]: validateGuestField(field, value) }));
    }, [onUpdate, markTouched]);

    const getError = (field: string) => {
        if (touched[field]) return liveErrors[field];
        if (submitted) return externalErrors[field];
        return undefined;
    };

    return (
        <div className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-black">Guest {idx + 1}</h3>
                <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 text-sm font-medium transition">
                    Remove
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-semibold tracking-wide text-gray-400 mb-1.5 uppercase">
                        Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Enter full name"
                        value={guest.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        onBlur={(e) => handleBlur("name", e.target.value)}
                        className={inputCls(!!getError("name"))}
                        autoComplete="off"
                    />
                    <FieldError message={getError("name")} />
                </div>
                <div>
                    <label className="block text-xs font-semibold tracking-wide text-gray-400 mb-1.5 uppercase">
                        Age <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Age"
                        value={guest.age}
                        onChange={(e) => handleChange("age", e.target.value)}
                        onBlur={(e) => handleBlur("age", e.target.value)}
                        className={inputCls(!!getError("age"))}
                        autoComplete="off"
                    />
                    <FieldError message={getError("age")} />
                </div>
                <div>
                    <label className="block text-xs font-semibold tracking-wide text-gray-400 mb-1.5 uppercase">
                        Gender <span className="text-red-400">*</span>
                    </label>
                    <select
                        aria-label="Gender"
                        value={guest.gender ?? ""}
                        onChange={(e) => handleChange("gender", e.target.value)}
                        onBlur={(e) => handleBlur("gender", e.target.value)}
                        className={`${inputCls(!!getError("gender"))} bg-white`}
                    >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <FieldError message={getError("gender")} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-semibold tracking-wide text-gray-400 mb-1.5 uppercase">
                        Nationality <span className="text-red-400">*</span>
                    </label>
                    <CountryDropdown
                        placeholder="Select country"
                        defaultValue={guest.nationality}
                        onChange={(val) => {
                            onUpdate("nationality", val);
                            if (touched["nationality"] || submitted) {
                                setLiveErrors((prev) => ({ ...prev, nationality: validateGuestField("nationality", val) }));
                            }
                            markTouched("nationality");
                        }}
                    />
                    <FieldError message={getError("nationality")} />
                </div>
                <div>
                    <label className="block text-xs font-semibold tracking-wide text-gray-400 mb-1.5 uppercase">
                        Guest Type <span className="text-red-400">*</span>
                    </label>
                    <select
                        aria-label="Guest type"
                        value={guest.guestType ?? "adult"}
                        onChange={(e) => handleChange("guestType", e.target.value)}
                        className={`${inputCls(false)} bg-white`}
                    >
                        <option value="adult">Adult</option>
                        <option value="child">Child</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export const GuestsList = ({
    guests,
    onUpdateGuest,
    onAddGuest,
    onRemoveGuest,
    guestErrors = {},
    submitted = false,
}: GuestsListProps) => {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#74C00F]/10 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-[#74C00F]" />
                </div>
                <h2 className="text-lg font-semibold text-black">Additional Guests</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                Add information for each guest joining the tour (excluding yourself as the representative)
            </p>

            {guests.length > 0 && (
                <div className="mb-4 flex flex-col gap-6">
                    {guests.map((guest, idx) => (
                        <GuestRow
                            key={idx}
                            idx={idx}
                            guest={guest}
                            onUpdate={(field, value) => onUpdateGuest(idx, field, value)}
                            onRemove={() => onRemoveGuest(idx)}
                            externalErrors={guestErrors[idx]}
                            submitted={submitted}
                        />
                    ))}
                </div>
            )}

            {guests.length === 0 ? (
                <button
                    type="button"
                    onClick={onAddGuest}
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-7 text-gray-400 hover:border-[#74C00F] hover:text-[#74C00F] transition group"
                >
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#74C00F]/10 flex items-center justify-center transition">
                        <UserPlus className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm">Add guest</span>
                    <span className="text-xs text-gray-300 group-hover:text-[#74C00F]/60 transition">
                        Click to add an additional guest
                    </span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onAddGuest}
                    className="flex items-center gap-2 text-[#74C00F] hover:text-[#62a30d] font-semibold text-sm mt-2 transition"
                >
                    <UserPlus className="w-4 h-4" />
                    Add another guest
                </button>
            )}
        </div>
    );
};

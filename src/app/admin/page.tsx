"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { firebaseConfigError, firestoreDb } from "@/lib/firebase";
import { defaultSiteContent, SiteContent } from "@/lib/site-content";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
type PaymentStatus = "unpaid" | "paid" | "refunded";
type ContentVersionAction = "save" | "restore";
type AdminSection = "overview" | "bookings" | "home" | "booking" | "fleet" | "versions";

type BookingRecord = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tripType: "one-way" | "round-trip" | "hourly";
  serviceDate: string;
  pickupTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleName: string;
  passengers: number;
  estimatedFare: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt?: Timestamp;
};

type SiteContentVersion = {
  id: string;
  snapshot: SiteContent;
  createdAt?: Timestamp;
  createdByEmail?: string;
  createdByUid?: string;
  action?: ContentVersionAction;
  sourceVersionId?: string;
};

const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled"];
const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "paid", "refunded"];
const ADMIN_PIN = "1844";
const PIN_SESSION_KEY = "wny-admin-pin-ok";

function formatTripType(tripType: BookingRecord["tripType"]) {
  if (tripType === "round-trip") return "Round Trip";
  if (tripType === "hourly") return "Hourly";
  return "One Way";
}

function normalizeSiteContent(data?: Partial<SiteContent>) {
  return {
    home: {
      ...defaultSiteContent.home,
      ...(data?.home ?? {}),
    },
    booking: {
      ...defaultSiteContent.booking,
      ...(data?.booking ?? {}),
    },
    fleet: (data?.fleet ?? defaultSiteContent.fleet).map((item, index) => {
      const fallback = defaultSiteContent.fleet[index] ?? defaultSiteContent.fleet[0];
      return {
        id: item.id ?? fallback.id,
        name: item.name ?? fallback.name,
        type: item.type ?? fallback.type,
        seats: item.seats ?? fallback.seats,
        luggage: item.luggage ?? fallback.luggage,
        image: item.image ?? fallback.image,
        description: item.description ?? fallback.description,
        baseFare: Number(item.baseFare ?? fallback.baseFare),
      };
    }),
  };
}

export default function AdminPage() {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string>("");

  const [contentDraft, setContentDraft] = useState<SiteContent>(defaultSiteContent);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMessage, setContentMessage] = useState<string>("");
  const [contentError, setContentError] = useState<string>("");
  const [contentVersions, setContentVersions] = useState<SiteContentVersion[]>([]);
  const [versionError, setVersionError] = useState<string>("");
  const [restoringVersionId, setRestoringVersionId] = useState<string>("");
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");

  const totalPending = useMemo(
    () => bookings.filter((booking) => booking.status === "pending").length,
    [bookings],
  );

  const totalRevenue = useMemo(
    () =>
      bookings
        .filter((booking) => booking.paymentStatus === "paid")
        .reduce((total, booking) => total + Number(booking.estimatedFare || 0), 0),
    [bookings],
  );

  const invalidPriceItems = useMemo(
    () => contentDraft.fleet.filter((item) => Number(item.baseFare) <= 0),
    [contentDraft.fleet],
  );

  const invalidPhotoItems = useMemo(
    () =>
      contentDraft.fleet.filter((item) => {
        const value = (item.image ?? "").trim();
        if (!value) {
          return true;
        }

        try {
          const parsed = new URL(value);
          const hasHttpProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
          return !hasHttpProtocol || Boolean(imageLoadErrors[item.id]);
        } catch {
          return true;
        }
      }),
    [contentDraft.fleet, imageLoadErrors],
  );

  const hasFleetValidationErrors = invalidPriceItems.length > 0 || invalidPhotoItems.length > 0;

  useEffect(() => {
    const savedPinState = window.sessionStorage.getItem(PIN_SESSION_KEY);
    if (savedPinState === "1") {
      setIsPinUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!isPinUnlocked) {
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!firestoreDb) {
      setError(firebaseConfigError ?? "Firebase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const bookingsQuery = query(collection(firestoreDb, "bookings"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const records = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data() as Omit<BookingRecord, "id">;
          return {
            id: snapshotDoc.id,
            ...data,
          };
        });

        setBookings(records);
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isPinUnlocked]);

  useEffect(() => {
    if (!isPinUnlocked || !firestoreDb) {
      return;
    }

    const contentRef = doc(firestoreDb, "siteContent", "main");

    const unsubscribe = onSnapshot(contentRef, (snapshot) => {
      if (!snapshot.exists()) {
        setContentDraft(defaultSiteContent);
        return;
      }

      setContentDraft(normalizeSiteContent(snapshot.data() as Partial<SiteContent>));
    });

    return () => unsubscribe();
  }, [isPinUnlocked]);

  useEffect(() => {
    if (!isPinUnlocked) {
      setContentVersions([]);
      return;
    }

    if (!firestoreDb) {
      setVersionError(firebaseConfigError ?? "Firebase is not configured.");
      return;
    }

    const versionsQuery = query(
      collection(firestoreDb, "siteContentVersions"),
      orderBy("createdAt", "desc"),
      limit(12),
    );

    const unsubscribe = onSnapshot(
      versionsQuery,
      (snapshot) => {
        const versions = snapshot.docs.map((versionDoc) => {
          const data = versionDoc.data() as Partial<SiteContentVersion> & {
            snapshot?: Partial<SiteContent>;
          };

          return {
            id: versionDoc.id,
            snapshot: normalizeSiteContent(data.snapshot),
            createdAt: data.createdAt,
            createdByEmail: data.createdByEmail,
            createdByUid: data.createdByUid,
            action: data.action,
            sourceVersionId: data.sourceVersionId,
          };
        });

        setContentVersions(versions);
        setVersionError("");
      },
      (snapshotError) => {
        setVersionError(snapshotError.message);
      },
    );

    return () => unsubscribe();
  }, [isPinUnlocked]);

  function formatDateTime(createdAt?: Timestamp) {
    if (!createdAt) return "—";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }).format(createdAt.toDate());
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  }

  function isValidHttpUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function unlockWithPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPinError("");

    if (pinInput.trim() !== ADMIN_PIN) {
      setPinError("Incorrect PIN.");
      return;
    }

    setIsPinUnlocked(true);
    window.sessionStorage.setItem(PIN_SESSION_KEY, "1");
    setPinInput("");
  }

  function lockAdmin() {
    setIsPinUnlocked(false);
    setPinInput("");
    setPinError("");
    window.sessionStorage.removeItem(PIN_SESSION_KEY);
  }

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    if (!isPinUnlocked) {
      setError("Admin PIN is required.");
      return;
    }

    if (!firestoreDb) {
      setError(firebaseConfigError ?? "Firebase is not configured.");
      return;
    }

    try {
      setSavingId(`${bookingId}:status`);
      setError("");
      await updateDoc(doc(firestoreDb, "bookings", bookingId), { status });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update booking status.");
    } finally {
      setSavingId("");
    }
  }

  async function updatePaymentStatus(bookingId: string, paymentStatus: PaymentStatus) {
    if (!isPinUnlocked) {
      setError("Admin PIN is required.");
      return;
    }

    if (!firestoreDb) {
      setError(firebaseConfigError ?? "Firebase is not configured.");
      return;
    }

    try {
      setSavingId(`${bookingId}:payment`);
      setError("");
      await updateDoc(doc(firestoreDb, "bookings", bookingId), { paymentStatus });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update payment status.");
    } finally {
      setSavingId("");
    }
  }

  function updateHomeField<K extends keyof SiteContent["home"]>(
    field: K,
    value: SiteContent["home"][K],
  ) {
    setContentDraft((previous) => ({
      ...previous,
      home: {
        ...previous.home,
        [field]: value,
      },
    }));
  }

  function updateBookingField<K extends keyof SiteContent["booking"]>(
    field: K,
    value: SiteContent["booking"][K],
  ) {
    setContentDraft((previous) => ({
      ...previous,
      booking: {
        ...previous.booking,
        [field]: value,
      },
    }));
  }

  function updateFleetField(
    index: number,
    field: keyof SiteContent["fleet"][number],
    value: string | number,
  ) {
    const itemId = contentDraft.fleet[index]?.id;

    if (field === "image" && itemId) {
      setImageLoadErrors((previous) => ({
        ...previous,
        [itemId]: false,
      }));
    }

    setContentDraft((previous) => ({
      ...previous,
      fleet: previous.fleet.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "baseFare"
                  ? Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0)
                  : value,
            }
          : item,
      ),
    }));
  }

  async function saveContentDraft() {
    if (!isPinUnlocked) {
      setContentError("Admin PIN is required.");
      return;
    }

    if (hasFleetValidationErrors) {
      const issues: string[] = [];

      if (invalidPriceItems.length > 0) {
        issues.push(`Prices must be greater than $0 for: ${invalidPriceItems.map((item) => item.id).join(", ")}`);
      }

      if (invalidPhotoItems.length > 0) {
        issues.push(`Valid Photo URL is required for: ${invalidPhotoItems.map((item) => item.id).join(", ")}`);
      }

      setContentError(`Cannot save yet. ${issues.join(". ")}.`);
      return;
    }

    if (!firestoreDb) {
      setContentError(firebaseConfigError ?? "Firebase is not configured.");
      return;
    }

    try {
      setContentSaving(true);
      setContentMessage("");
      setContentError("");

      const batch = writeBatch(firestoreDb);
      const contentRef = doc(firestoreDb, "siteContent", "main");
      const versionRef = doc(collection(firestoreDb, "siteContentVersions"));

      batch.set(
        contentRef,
        {
          ...contentDraft,
          updatedAt: serverTimestamp(),
          updatedByUid: "pin-admin",
          updatedByEmail: "pin-admin",
        },
        { merge: true },
      );

      batch.set(versionRef, {
        snapshot: contentDraft,
        action: "save",
        createdAt: serverTimestamp(),
        createdByUid: "pin-admin",
        createdByEmail: "pin-admin",
      });

      await batch.commit();

      setContentMessage("Website content saved successfully. Version snapshot created.");
    } catch (saveError) {
      setContentError(
        saveError instanceof Error ? saveError.message : "Unable to save website content.",
      );
    } finally {
      setContentSaving(false);
    }
  }

  async function restoreContentVersion(versionId: string, snapshot: SiteContent) {
    if (!isPinUnlocked) {
      setContentError("Admin PIN is required.");
      return;
    }

    if (!firestoreDb) {
      setContentError(firebaseConfigError ?? "Firebase is not configured.");
      return;
    }

    if (!window.confirm("Restore this version? This will replace current website content.")) {
      return;
    }

    try {
      setRestoringVersionId(versionId);
      setContentMessage("");
      setContentError("");

      const batch = writeBatch(firestoreDb);
      const contentRef = doc(firestoreDb, "siteContent", "main");
      const restoreVersionRef = doc(collection(firestoreDb, "siteContentVersions"));

      batch.set(
        contentRef,
        {
          ...snapshot,
          updatedAt: serverTimestamp(),
          updatedByUid: "pin-admin",
          updatedByEmail: "pin-admin",
        },
        { merge: true },
      );

      batch.set(restoreVersionRef, {
        snapshot,
        action: "restore",
        sourceVersionId: versionId,
        createdAt: serverTimestamp(),
        createdByUid: "pin-admin",
        createdByEmail: "pin-admin",
      });

      await batch.commit();

      setContentDraft(snapshot);
      setContentMessage("Version restored successfully.");
    } catch (restoreError) {
      setContentError(
        restoreError instanceof Error ? restoreError.message : "Unable to restore this version.",
      );
    } finally {
      setRestoringVersionId("");
    }
  }

  if (!isPinUnlocked) {
    return (
      <div className="min-h-screen bg-neutral-950 px-6 py-10 text-white selection:bg-amber-500 selection:text-black">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
          <p className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-amber-400">
            ADMIN PIN
          </p>
          <h1 className="mt-3 text-2xl font-bold">Admin Login</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Enter your PIN to access the admin panel.
          </p>

          {firebaseConfigError ? (
            <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {firebaseConfigError}
            </p>
          ) : null}

          {pinError ? (
            <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {pinError}
            </p>
          ) : null}

          <form onSubmit={unlockWithPin} className="mt-5 space-y-3">
            <input
              type="password"
              autoComplete="off"
              inputMode="numeric"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              placeholder="PIN"
              className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              Enter admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-amber-500 selection:text-black">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-white">
              WNY <span className="text-amber-500">BLACK CAR</span>
            </p>
            <p className="text-xs text-neutral-400">Dispatch & Booking Operations</p>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm text-neutral-300 transition-colors hover:text-amber-400">
              Home
            </Link>
            <Link href="/booking" className="text-sm text-neutral-300 transition-colors hover:text-amber-400">
              Booking
            </Link>
            <p className="text-xs text-neutral-400">PIN admin</p>
            <button
              type="button"
              onClick={lockAdmin}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-10 pt-28">
        <header className="mb-6">
          <p className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-amber-400">
            ADMIN PANEL
          </p>
          <h1 className="mt-3 text-3xl font-bold">WordPress-style Admin Panel</h1>
          <p className="mt-1 text-sm text-neutral-400">Left navigation by content groups, right editor by section.</p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 lg:sticky lg:top-28 lg:h-fit">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Operations</p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setActiveSection("overview")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === "overview"
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-neutral-200 hover:bg-white/10"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("bookings")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === "bookings"
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-neutral-200 hover:bg-white/10"
                }`}
              >
                Bookings
              </button>
            </div>

            <p className="mt-5 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">CMS</p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setActiveSection("home")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === "home"
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-neutral-200 hover:bg-white/10"
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("booking")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === "booking"
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-neutral-200 hover:bg-white/10"
                }`}
              >
                Booking Page
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("fleet")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === "fleet"
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-neutral-200 hover:bg-white/10"
                }`}
              >
                Fleet
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("versions")}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === "versions"
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-neutral-200 hover:bg-white/10"
                }`}
              >
                Versions
              </button>
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
            {(activeSection === "home" || activeSection === "booking" || activeSection === "fleet") && (
              <div className="mb-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveContentDraft}
                  disabled={contentSaving || hasFleetValidationErrors}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {contentSaving ? "Saving..." : hasFleetValidationErrors ? "Fix validation errors to save" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setContentDraft(defaultSiteContent)}
                  className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Reset to defaults
                </button>
              </div>
            )}

            {contentError ? (
              <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {contentError}
              </p>
            ) : null}

            {contentMessage ? (
              <p className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {contentMessage}
              </p>
            ) : null}

            {activeSection === "overview" ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Overview</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-neutral-950/70 px-4 py-3">
                    <p className="text-xs text-neutral-400">Total bookings</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{bookings.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-neutral-950/70 px-4 py-3">
                    <p className="text-xs text-neutral-400">Pending</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{totalPending}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-neutral-950/70 px-4 py-3">
                    <p className="text-xs text-neutral-400">Paid revenue</p>
                    <p className="mt-1 text-2xl font-semibold text-amber-400">${totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-neutral-950/70 px-4 py-3">
                    <p className="text-xs text-neutral-400">CMS versions</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{contentVersions.length}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-500">Use the left menu to edit content by group.</p>
              </div>
            ) : null}

            {activeSection === "bookings" ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Bookings</h2>

                {error ? (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </p>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/60">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                      <thead className="bg-neutral-900/90 text-xs uppercase tracking-wide text-neutral-400">
                        <tr>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Route</th>
                          <th className="px-4 py-3">Trip</th>
                          <th className="px-4 py-3">Vehicle</th>
                          <th className="px-4 py-3">Fare</th>
                          <th className="px-4 py-3">Booking Status</th>
                          <th className="px-4 py-3">Payment</th>
                          <th className="px-4 py-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {loading ? (
                          <tr>
                            <td className="px-4 py-6 text-neutral-400" colSpan={8}>
                              Loading bookings...
                            </td>
                          </tr>
                        ) : bookings.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6 text-neutral-400" colSpan={8}>
                              No bookings yet.
                            </td>
                          </tr>
                        ) : (
                          bookings.map((booking) => (
                            <tr key={booking.id} className="align-top">
                              <td className="px-4 py-3">
                                <p className="font-medium text-white">{booking.customerName || "—"}</p>
                                <p className="text-xs text-neutral-300">{booking.customerEmail || "—"}</p>
                                <p className="text-xs text-neutral-400">{booking.customerPhone || "—"}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="max-w-xs text-xs text-neutral-200">{booking.pickupAddress || "—"}</p>
                                <p className="my-1 text-xs text-neutral-500">to</p>
                                <p className="max-w-xs text-xs text-neutral-200">{booking.dropoffAddress || "—"}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-neutral-200">
                                <p>{formatTripType(booking.tripType)}</p>
                                <p className="text-neutral-400">{booking.serviceDate || "—"}</p>
                                <p className="text-neutral-400">{booking.pickupTime || "—"}</p>
                                <p className="text-neutral-400">Passengers: {booking.passengers || 0}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-neutral-200">{booking.vehicleName || "—"}</td>
                              <td className="px-4 py-3 font-semibold text-amber-400">
                                ${Number(booking.estimatedFare || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={booking.status}
                                  disabled={savingId === `${booking.id}:status`}
                                  onChange={(event) =>
                                    updateBookingStatus(booking.id, event.target.value as BookingStatus)
                                  }
                                  className="w-32 rounded-md border border-white/15 bg-neutral-950 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                                >
                                  {BOOKING_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={booking.paymentStatus}
                                  disabled={savingId === `${booking.id}:payment`}
                                  onChange={(event) =>
                                    updatePaymentStatus(booking.id, event.target.value as PaymentStatus)
                                  }
                                  className="w-28 rounded-md border border-white/15 bg-neutral-950 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                                >
                                  {PAYMENT_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-xs text-neutral-400">{formatDateTime(booking.createdAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeSection === "home" ? (
              <article className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
                <h2 className="text-2xl font-bold">Home</h2>
                <input
                  value={contentDraft.home.heroBadge}
                  onChange={(event) => updateHomeField("heroBadge", event.target.value)}
                  placeholder="Hero badge"
                  className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
                <input
                  value={contentDraft.home.heroTitleLine1}
                  onChange={(event) => updateHomeField("heroTitleLine1", event.target.value)}
                  placeholder="Hero title line 1"
                  className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
                <input
                  value={contentDraft.home.heroTitleLine2}
                  onChange={(event) => updateHomeField("heroTitleLine2", event.target.value)}
                  placeholder="Hero title line 2"
                  className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
                <textarea
                  value={contentDraft.home.heroDescription}
                  onChange={(event) => updateHomeField("heroDescription", event.target.value)}
                  placeholder="Hero description"
                  className="h-24 w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={contentDraft.home.primaryCta}
                    onChange={(event) => updateHomeField("primaryCta", event.target.value)}
                    placeholder="Primary CTA"
                    className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                  <input
                    value={contentDraft.home.secondaryCta}
                    onChange={(event) => updateHomeField("secondaryCta", event.target.value)}
                    placeholder="Secondary CTA"
                    className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>
              </article>
            ) : null}

            {activeSection === "booking" ? (
              <article className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
                <h2 className="text-2xl font-bold">Booking Page</h2>
                <p className="text-sm text-neutral-400">
                  These fields are shown at the top of the public booking page.
                </p>
                <input
                  value={contentDraft.booking.formTitle}
                  onChange={(event) => updateBookingField("formTitle", event.target.value)}
                  placeholder="Booking title"
                  className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
                <textarea
                  value={contentDraft.booking.formSubtitle}
                  onChange={(event) => updateBookingField("formSubtitle", event.target.value)}
                  placeholder="Booking subtitle"
                  className="h-24 w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </article>
            ) : null}

            {activeSection === "fleet" ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Fleet</h2>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                  <p className="font-semibold">Where to edit prices and photos</p>
                  <p className="mt-1">
                    Use <span className="font-semibold">Base Fare (USD)</span> for pricing and <span className="font-semibold">Photo URL</span> for vehicle images.
                    These values are used on both the Home fleet cards and the Booking vehicle selection.
                  </p>
                </div>
                {hasFleetValidationErrors ? (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                    <p className="font-semibold">Save blocked until all fleet items are valid.</p>
                    {invalidPriceItems.length > 0 ? (
                      <p className="mt-1">Prices must be greater than $0 for: {invalidPriceItems.map((item) => item.id).join(", ")}.</p>
                    ) : null}
                    {invalidPhotoItems.length > 0 ? (
                      <p className="mt-1">Photo URL must be valid and loadable for: {invalidPhotoItems.map((item) => item.id).join(", ")}.</p>
                    ) : null}
                  </div>
                ) : null}
                {contentDraft.fleet.map((item, index) => {
                  const hasInvalidPrice = Number(item.baseFare) <= 0;
                  const photoValue = (item.image ?? "").trim();
                  const hasInvalidPhoto =
                    !photoValue || !isValidHttpUrl(photoValue) || Boolean(imageLoadErrors[item.id]);
                  const isItemValid = !hasInvalidPrice && !hasInvalidPhoto;

                  return (
                    <article key={item.id} className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">{item.id}</p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isItemValid
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {isItemValid ? "Valid" : "Needs fixes"}
                          </span>
                          <p className="text-xs text-neutral-400">Used in Home + Booking</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <input
                          value={item.name}
                          onChange={(event) => updateFleetField(index, "name", event.target.value)}
                          placeholder="Vehicle name"
                          className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <input
                          value={item.type}
                          onChange={(event) => updateFleetField(index, "type", event.target.value)}
                          placeholder="Vehicle class"
                          className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.baseFare}
                          onChange={(event) =>
                            updateFleetField(index, "baseFare", Number(event.target.value || 0))
                          }
                          placeholder="Base Fare (USD)"
                          className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <input
                          value={item.seats}
                          onChange={(event) => updateFleetField(index, "seats", event.target.value)}
                          placeholder="Seats text"
                          className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <input
                          value={item.luggage}
                          onChange={(event) => updateFleetField(index, "luggage", event.target.value)}
                          placeholder="Luggage text"
                          className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                        <input
                          value={item.image}
                          onChange={(event) => updateFleetField(index, "image", event.target.value)}
                          placeholder="Photo URL"
                          className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                        />
                      </div>

                      {(hasInvalidPrice || hasInvalidPhoto) ? (
                        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                          {hasInvalidPrice ? <p>Base Fare must be greater than $0.</p> : null}
                          {hasInvalidPhoto ? (
                            <p>Photo URL must be a valid and loadable http/https image link.</p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
                          {item.image && !imageLoadErrors[item.id] ? (
                            <img
                              src={item.image}
                              alt={`${item.name} preview`}
                              className="h-32 w-full object-cover"
                              onError={() =>
                                setImageLoadErrors((previous) => ({
                                  ...previous,
                                  [item.id]: true,
                                }))
                              }
                              onLoad={() =>
                                setImageLoadErrors((previous) => ({
                                  ...previous,
                                  [item.id]: false,
                                }))
                              }
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center px-3 text-center text-xs text-neutral-400">
                              Image preview unavailable. Check Photo URL.
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3 text-sm text-neutral-300">
                          <p>
                            <span className="font-semibold text-white">Validation:</span>{" "}
                            {isItemValid ? "Ready to save" : "Fix required"}
                          </p>
                          <p>
                            <span className="font-semibold text-white">Current Price:</span>{" "}
                            {formatCurrency(Number(item.baseFare || 0))}
                          </p>
                          <p className="mt-1 break-all">
                            <span className="font-semibold text-white">Current Photo URL:</span>{" "}
                            {item.image || "—"}
                          </p>
                          {imageLoadErrors[item.id] ? (
                            <p className="mt-2 text-xs text-rose-300">
                              Photo URL could not be loaded. Use a direct image URL (jpg, png, webp).
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-neutral-400">
                            Formatted fare preview: {formatCurrency(Number(item.baseFare || 0))}
                          </p>
                        </div>
                      </div>

                      <textarea
                        value={item.description}
                        onChange={(event) => updateFleetField(index, "description", event.target.value)}
                        placeholder="Vehicle description"
                        className="mt-3 h-20 w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                      />
                    </article>
                  );
                })}
              </div>
            ) : null}

            {activeSection === "versions" ? (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">Versions</h2>

                {versionError ? (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {versionError}
                  </p>
                ) : null}

                {contentVersions.length === 0 ? (
                  <p className="text-sm text-neutral-400">No CMS versions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {contentVersions.map((version) => (
                      <article
                        key={version.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-white">{formatDateTime(version.createdAt)}</p>
                          <p className="text-xs text-neutral-400">
                            {version.action === "restore" ? "Restore" : "Save"} • {version.createdByEmail || "unknown"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => restoreContentVersion(version.id, version.snapshot)}
                          disabled={restoringVersionId === version.id || contentSaving}
                          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {restoringVersionId === version.id ? "Restoring..." : "Restore"}
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  );
}

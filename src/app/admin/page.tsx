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

  function unlockWithPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPinError("");

    if (pinInput.trim() !== ADMIN_PIN) {
      setPinError("PIN incorrecto.");
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
      setError("PIN admin requerido.");
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
      setError("PIN admin requerido.");
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
    setContentDraft((previous) => ({
      ...previous,
      fleet: previous.fleet.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === "baseFare" ? Number(value) : value,
            }
          : item,
      ),
    }));
  }

  async function saveContentDraft() {
    if (!isPinUnlocked) {
      setContentError("PIN admin requerido.");
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
      setContentError("PIN admin requerido.");
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
            Ingresa el PIN para entrar al panel de administración.
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
              Entrar al admin
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
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-amber-400">
              LIVE BOOKING DASHBOARD
            </p>
            <h1 className="mt-3 text-3xl font-bold">Admin Booking Dashboard</h1>
            <p className="mt-1 text-sm text-neutral-400">Manage trip status, payment updates and live booking flow.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-right">
              <p className="text-xs text-neutral-400">Pending</p>
              <p className="text-xl font-semibold text-white">{totalPending}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-right">
              <p className="text-xs text-neutral-400">Paid Revenue</p>
              <p className="text-xl font-semibold text-amber-400">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </header>

        {error ? (
          <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/60">
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
        </section>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Real-time sync enabled via Firestore snapshot listeners.
        </p>

        <section className="mt-8 rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
          <header className="mb-6">
            <p className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-amber-400">
              WEBSITE CONTENT MANAGER
            </p>
            <h2 className="mt-3 text-2xl font-bold">Edit texts, photos and prices</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Changes update Home and Booking pages automatically.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
              <h3 className="text-sm font-semibold text-white">Home hero copy</h3>

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

            <article className="space-y-3 rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
              <h3 className="text-sm font-semibold text-white">Booking page copy</h3>
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
          </div>

          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Fleet content and pricing</h3>
            {contentDraft.fleet.map((item, index) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-400">
                  {item.id}
                </p>

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
                    step="1"
                    value={item.baseFare}
                    onChange={(event) => updateFleetField(index, "baseFare", Number(event.target.value || 0))}
                    placeholder="Base fare"
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
                    placeholder="Image URL"
                    className="w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                </div>

                <textarea
                  value={item.description}
                  onChange={(event) => updateFleetField(index, "description", event.target.value)}
                  placeholder="Vehicle description"
                  className="mt-3 h-20 w-full rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                />
              </article>
            ))}
          </div>

          {contentError ? (
            <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {contentError}
            </p>
          ) : null}

          {contentMessage ? (
            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {contentMessage}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveContentDraft}
              disabled={contentSaving}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {contentSaving ? "Saving content..." : "Save website content"}
            </button>
            <button
              type="button"
              onClick={() => setContentDraft(defaultSiteContent)}
              className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Reset to defaults
            </button>
          </div>

          <section className="mt-8 rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Content versions</h3>
              <p className="text-xs text-neutral-400">Last {contentVersions.length} snapshots</p>
            </div>

            {versionError ? (
              <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
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
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2"
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
        </section>
      </main>
    </div>
  );
}

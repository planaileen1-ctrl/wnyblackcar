"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { firebaseConfigError, firestoreDb } from "@/lib/firebase";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
type PaymentStatus = "unpaid" | "paid" | "refunded";

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

const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled"];
const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "paid", "refunded"];

export default function AdminPage() {
    function formatTripType(tripType: BookingRecord["tripType"]) {
      if (tripType === "round-trip") return "Round Trip";
      if (tripType === "hourly") return "Hourly";
      return "One Way";
    }

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string>("");

  useEffect(() => {
    if (!firestoreDb) {
      setError(firebaseConfigError ?? "Firebase is not configured.");
      setLoading(false);
      return;
    }

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
  }, []);

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

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
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
            <p className="text-xs text-neutral-400">Operations Center</p>
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
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firebaseConfigError, firestoreDb } from "@/lib/firebase";

type VehicleOption = {
  id: string;
  name: string;
  seats: string;
  image: string;
  baseFare: number;
};

const vehicles: VehicleOption[] = [
  {
    id: "suburban",
    name: "Chevrolet Suburban",
    seats: "Up to 6 passengers",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    baseFare: 145,
  },
  {
    id: "sedan",
    name: "Luxury Sedan",
    seats: "Up to 3 passengers",
    image:
      "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1600&q=80",
    baseFare: 120,
  },
  {
    id: "sprinter",
    name: "Mercedes Sprinter Van",
    seats: "Up to 14 passengers",
    image:
      "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1600&q=80",
    baseFare: 220,
  },
];

type BookingFormState = {
  serviceDate: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupTime: string;
  passengers: number;
  fullName: string;
  email: string;
  phone: string;
};

export default function BookingPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicles[0].id);
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [formState, setFormState] = useState<BookingFormState>({
    serviceDate: "",
    pickupAddress: "",
    dropoffAddress: "",
    pickupTime: "",
    passengers: 2,
    fullName: "",
    email: "",
    phone: "",
  });

  const currentDateUs = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    }).format(new Date());
  }, []);

  const selected = vehicles.find((vehicle) => vehicle.id === selectedVehicle) ?? vehicles[0];
  const estimatedFare = tripType === "round-trip" ? selected.baseFare * 2 : selected.baseFare;

  function updateField<K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    if (!firestoreDb) {
      setSubmitError(firebaseConfigError ?? "Firebase is not configured.");
      return;
    }

    if (!formState.serviceDate || !formState.pickupTime) {
      setSubmitError("Please select service date and pickup time.");
      return;
    }

    if (!formState.pickupAddress || !formState.dropoffAddress) {
      setSubmitError("Please enter pickup and drop-off addresses.");
      return;
    }

    if (!formState.fullName || !formState.email || !formState.phone) {
      setSubmitError("Please complete your contact information.");
      return;
    }

    try {
      setIsSubmitting(true);

      await addDoc(collection(firestoreDb, "bookings"), {
        tripType,
        serviceDate: formState.serviceDate,
        pickupTime: formState.pickupTime,
        pickupAddress: formState.pickupAddress,
        dropoffAddress: formState.dropoffAddress,
        passengers: formState.passengers,
        vehicleId: selected.id,
        vehicleName: selected.name,
        estimatedFare,
        customerName: formState.fullName,
        customerEmail: formState.email,
        customerPhone: formState.phone,
        status: "pending",
        paymentStatus: "unpaid",
        source: "web-booking",
        createdAt: serverTimestamp(),
      });

      setSubmitMessage("Booking request saved successfully. Our team will contact you shortly.");
      setFormState({
        serviceDate: "",
        pickupAddress: "",
        dropoffAddress: "",
        pickupTime: "",
        passengers: 2,
        fullName: "",
        email: "",
        phone: "",
      });
      setTripType("one-way");
      setSelectedVehicle(vehicles[0].id);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? `Unable to save booking: ${error.message}`
          : "Unable to save booking right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-amber-500 selection:text-black">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-white">
              WNY <span className="text-amber-500">BLACK CAR</span>
            </p>
            <p className="text-xs text-neutral-400">Private Reservation Desk</p>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm text-neutral-300 transition-colors hover:text-amber-400">
              Home
            </Link>
            <Link
              href="/admin"
              className="text-sm text-neutral-300 transition-colors hover:text-amber-400"
            >
              Admin
            </Link>
            <p className="text-xs text-neutral-400">{currentDateUs} • EST</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 pb-12 pt-28 lg:grid-cols-[1.15fr_0.85fr] lg:pb-16">
        <section id="booking-form" className="rounded-3xl border border-white/10 bg-neutral-900/70 p-6 lg:p-8">
          <p className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-amber-400">
            PREMIUM BOOKING FORM
          </p>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Reserve Your Chauffeur</h1>
          <p className="mt-2 text-sm text-neutral-300 sm:text-base">
            Complete your trip details and our dispatch team will confirm availability promptly.
          </p>

          <form className="mt-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Trip Type</span>
                <select
                  value={tripType}
                  onChange={(event) => setTripType(event.target.value as "one-way" | "round-trip")}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                >
                  <option value="one-way">One Way</option>
                  <option value="round-trip">Round Trip</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Service Date</span>
                <input
                  type="date"
                  value={formState.serviceDate}
                  onChange={(event) => updateField("serviceDate", event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Pickup Address</span>
                <input
                  type="text"
                  placeholder="Buffalo Niagara International Airport"
                  value={formState.pickupAddress}
                  onChange={(event) => updateField("pickupAddress", event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Drop-off Address</span>
                <input
                  type="text"
                  placeholder="Downtown Buffalo, NY"
                  value={formState.dropoffAddress}
                  onChange={(event) => updateField("dropoffAddress", event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Pickup Time</span>
                <input
                  type="time"
                  value={formState.pickupTime}
                  onChange={(event) => updateField("pickupTime", event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Passengers</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={formState.passengers}
                  onChange={(event) =>
                    updateField("passengers", Number.parseInt(event.target.value || "1", 10))
                  }
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400"
                />
              </label>
            </div>

            <div className="mt-8 space-y-3">
              <p className="text-sm font-semibold text-white">Select Vehicle</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`group overflow-hidden rounded-2xl border text-left transition ${
                      selectedVehicle === vehicle.id
                        ? "border-amber-400"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div
                      className="h-28 bg-cover bg-center"
                      style={{ backgroundImage: `url(${vehicle.image})` }}
                    />
                    <div className="bg-neutral-900 p-3">
                      <p className="text-sm font-semibold">{vehicle.name}</p>
                      <p className="text-xs text-neutral-300">{vehicle.seats}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Full Name</span>
                <input
                  type="text"
                  placeholder="John Carter"
                  value={formState.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Email</span>
                <input
                  type="email"
                  placeholder="john@email.com"
                  value={formState.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-medium tracking-wide text-neutral-300">Phone Number</span>
                <input
                  type="tel"
                  placeholder="(716) 000-0000"
                  value={formState.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                />
              </label>

              {submitError ? (
                <p className="sm:col-span-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {submitError}
                </p>
              ) : null}

              {submitMessage ? (
                <p className="sm:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {submitMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="sm:col-span-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving booking..." : "Submit Booking Request"}
              </button>
            </div>
          </form>
        </section>

        <aside className="h-fit rounded-3xl border border-white/10 bg-gradient-to-b from-neutral-900 to-black p-6 lg:sticky lg:top-28">
          <h2 className="text-xl font-semibold">Booking Summary</h2>
          <p className="mt-2 text-sm text-neutral-300">Review your trip details before submitting.</p>

          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-neutral-400">Trip</p>
              <p className="font-medium">{tripType === "round-trip" ? "Round Trip" : "One Way"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-neutral-400">Vehicle</p>
              <p className="font-medium">{selected.name}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-neutral-400">Capacity</p>
              <p className="font-medium">{selected.seats}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-300">Estimated total</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">${estimatedFare.toFixed(2)} USD</p>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Service standards</p>
            <ul className="mt-3 space-y-2 text-sm text-neutral-300">
              <li>• Professionally vetted chauffeurs</li>
              <li>• 24/7 dispatch support</li>
              <li>• Discreet, private transportation</li>
            </ul>
          </div>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Your request is reviewed by dispatch before final confirmation.
          </p>
        </aside>
      </main>
    </div>
  );
}

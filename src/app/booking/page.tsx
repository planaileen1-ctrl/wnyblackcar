"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Users,
} from "lucide-react";
import { firebaseConfigError, firestoreDb } from "@/lib/firebase";
import VirtualConcierge from "@/components/virtual-concierge";

type ServiceType = "one-way" | "round-trip" | "hourly";

type VehicleOption = {
  id: string;
  name: string;
  type: string;
  seats: string;
  luggage: string;
  image: string;
  baseFare: number;
  description: string;
};

const vehicles: VehicleOption[] = [
  {
    id: "sedan",
    name: "Luxury Sedan",
    type: "Executive Class",
    seats: "Up to 3 passengers",
    luggage: "2 suitcases",
    image:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1200",
    baseFare: 120,
    description:
      "Perfect for executive transfers and individual business travel with total comfort and privacy.",
  },
  {
    id: "suv",
    name: "Premium SUV",
    type: "First Class",
    seats: "Up to 6 passengers",
    luggage: "5 suitcases",
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=1200",
    baseFare: 145,
    description:
      "Ample space for families and small groups with premium comfort and elegant arrival presence.",
  },
  {
    id: "sprinter",
    name: "Executive Van",
    type: "Group Class",
    seats: "Up to 14 passengers",
    luggage: "10 suitcases",
    image:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=1200",
    baseFare: 220,
    description:
      "The ideal option for event logistics, executive teams, and large group transportation.",
  },
];

type BookingFormState = {
  serviceType: ServiceType;
  serviceDate: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupTime: string;
  passengers: number;
  fullName: string;
  email: string;
  phone: string;
  specialInstructions: string;
};

const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: "one-way", label: "One Way" },
  { value: "round-trip", label: "Round Trip" },
  { value: "hourly", label: "Hourly" },
];

export default function BookingPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [formState, setFormState] = useState<BookingFormState>({
    serviceType: "one-way",
    serviceDate: "",
    pickupAddress: "",
    dropoffAddress: "",
    pickupTime: "",
    passengers: 2,
    fullName: "",
    email: "",
    phone: "",
    specialInstructions: "",
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

  const selected = vehicles.find((vehicle) => vehicle.id === selectedVehicle) ?? null;

  const serviceMultiplier = useMemo(() => {
    if (formState.serviceType === "round-trip") return 2;
    if (formState.serviceType === "hourly") return 3;
    return 1;
  }, [formState.serviceType]);

  const estimatedFare = useMemo(
    () => (selected ? selected.baseFare * serviceMultiplier : 0),
    [selected, serviceMultiplier],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCheckoutStatus(params.get("checkout"));
  }, []);

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

    if (!selected) {
      setSubmitError("Please select a vehicle.");
      return;
    }

    try {
      setIsSubmitting(true);

      const bookingRef = await addDoc(collection(firestoreDb, "bookings"), {
        tripType: formState.serviceType,
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
        specialInstructions: formState.specialInstructions,
        status: "pending",
        paymentStatus: "unpaid",
        source: "web-booking",
        createdAt: serverTimestamp(),
      });

      const checkoutResponse = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingRef.id,
          vehicleId: selected.id,
          serviceType: formState.serviceType,
          customerName: formState.fullName,
          customerEmail: formState.email,
        }),
      });

      const checkoutData = (await checkoutResponse.json()) as { url?: string; error?: string };

      if (!checkoutResponse.ok || !checkoutData.url) {
        setSubmitMessage("Booking saved. Stripe checkout could not start automatically.");
        setSubmitError(
          checkoutData.error ?? "Unable to create Stripe checkout session. Please contact dispatch.",
        );
        return;
      }

      window.location.assign(checkoutData.url);

      setSubmitMessage("Redirecting to secure payment...");
      setFormState({
        serviceType: "one-way",
        serviceDate: "",
        pickupAddress: "",
        dropoffAddress: "",
        pickupTime: "",
        passengers: 2,
        fullName: "",
        email: "",
        phone: "",
        specialInstructions: "",
      });
      setSelectedVehicle("");
      setBookingStep(1);
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

  const canProceedStep1 =
    Boolean(formState.pickupAddress.trim()) &&
    Boolean(formState.dropoffAddress.trim()) &&
    Boolean(formState.serviceDate) &&
    Boolean(formState.pickupTime);

  const canProceedStep2 = Boolean(selected);

  function goToStep(nextStep: 1 | 2 | 3) {
    setSubmitError("");
    setBookingStep(nextStep);
  }

  function goToStepFromConcierge(nextStep: 1 | 2 | 3) {
    if (nextStep === 2 && !canProceedStep1) {
      setSubmitError("Complete trip details first so I can open vehicle selection.");
      return;
    }

    if (nextStep === 3) {
      if (!canProceedStep1) {
        setSubmitError("Complete trip details first before proceeding to confirmation.");
        return;
      }

      if (!canProceedStep2) {
        setSubmitError("Select a vehicle first before proceeding to confirmation.");
        return;
      }
    }

    setSubmitError("");
    setBookingStep(nextStep);
  }

  function serviceTypeLabel(type: ServiceType) {
    if (type === "round-trip") return "Round Trip";
    if (type === "hourly") return "Hourly";
    return "One Way";
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

          {checkoutStatus === "success" ? (
            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Payment received successfully. Your reservation is now in our dispatch queue.
            </p>
          ) : null}

          {checkoutStatus === "cancelled" ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Stripe checkout was cancelled. Your reservation draft is saved and can be completed again.
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-1 items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    bookingStep >= step ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {bookingStep > step ? <CheckCircle2 className="h-5 w-5" /> : step}
                </div>
                {step < 3 ? (
                  <div
                    className={`mx-3 h-[2px] flex-1 ${
                      bookingStep > step ? "bg-amber-500" : "bg-white/10"
                    }`}
                  />
                ) : null}
              </div>
            ))}
          </div>

          <form className="mt-6" onSubmit={handleSubmit}>
            {bookingStep === 1 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {SERVICE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("serviceType", option.value)}
                      className={`rounded-2xl border py-3 text-sm font-semibold transition-all ${
                        formState.serviceType === option.value
                          ? "border-amber-500 bg-amber-500/10 text-amber-400"
                          : "border-white/10 bg-white/5 text-neutral-300 hover:border-white/20"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Pickup Location</span>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                      <input
                        type="text"
                        placeholder="Enter pickup address"
                        value={formState.pickupAddress}
                        onChange={(event) => updateField("pickupAddress", event.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-neutral-950 py-3 pl-11 pr-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                      />
                    </div>
                  </label>

                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Drop-off Location</span>
                    <div className="relative">
                      <Navigation className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                      <input
                        type="text"
                        placeholder="Enter destination address"
                        value={formState.dropoffAddress}
                        onChange={(event) => updateField("dropoffAddress", event.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-neutral-950 py-3 pl-11 pr-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                      />
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Service Date</span>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                      <input
                        type="date"
                        value={formState.serviceDate}
                        onChange={(event) => updateField("serviceDate", event.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-neutral-950 py-3 pl-11 pr-3 text-sm text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Pickup Time</span>
                    <div className="relative">
                      <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400" />
                      <input
                        type="time"
                        value={formState.pickupTime}
                        onChange={(event) => updateField("pickupTime", event.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-neutral-950 py-3 pl-11 pr-3 text-sm text-white outline-none focus:border-amber-400"
                      />
                    </div>
                  </label>

                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Passengers</span>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={formState.passengers}
                      onChange={(event) =>
                        updateField("passengers", Number.parseInt(event.target.value || "1", 10))
                      }
                      className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-3 text-sm text-white outline-none focus:border-amber-400"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => goToStep(2)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-bold text-black transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue to Vehicle Selection
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {bookingStep === 2 ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Select Your Vehicle</h2>
                  <p className="text-sm text-neutral-400">Choose the class that best fits your trip.</p>
                </div>

                <div className="space-y-4">
                  {vehicles.map((vehicle) => {
                    const isActive = selectedVehicle === vehicle.id;
                    return (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => setSelectedVehicle(vehicle.id)}
                        className={`flex w-full flex-col overflow-hidden rounded-2xl border text-left transition md:flex-row ${
                          isActive
                            ? "border-amber-500 bg-amber-500/5"
                            : "border-white/10 bg-white/5 hover:border-white/25"
                        }`}
                      >
                        <div
                          className="h-44 w-full bg-cover bg-center md:h-auto md:w-60"
                          style={{ backgroundImage: `url(${vehicle.image})` }}
                        />

                        <div className="flex-1 p-5">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold">{vehicle.name}</p>
                              <p className="text-xs text-neutral-400">{vehicle.type}</p>
                            </div>
                            {isActive ? <CheckCircle2 className="h-6 w-6 text-amber-400" /> : null}
                          </div>

                          <p className="text-sm text-neutral-300">{vehicle.description}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-neutral-300">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-amber-400" /> {vehicle.seats}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5 text-amber-400" /> {vehicle.luggage}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    disabled={!canProceedStep2}
                    className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Confirm Booking Details
                  </button>
                </div>
              </div>
            ) : null}

            {bookingStep === 3 ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Complete Reservation</h2>
                  <p className="text-sm text-neutral-400">Final contact details for dispatch confirmation.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Full Name</span>
                    <input
                      type="text"
                      placeholder="John Carter"
                      value={formState.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Email</span>
                    <input
                      type="email"
                      placeholder="john@email.com"
                      value={formState.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Phone Number</span>
                    <input
                      type="tel"
                      placeholder="(716) 000-0000"
                      value={formState.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                    />
                  </label>

                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-medium tracking-wide text-neutral-300">Special Instructions</span>
                    <textarea
                      placeholder="Flight number, terminal, access notes..."
                      value={formState.specialInstructions}
                      onChange={(event) => updateField("specialInstructions", event.target.value)}
                      className="h-24 w-full rounded-xl border border-white/15 bg-neutral-950 px-3 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400"
                    />
                  </label>
                </div>

                {submitError ? (
                  <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {submitError}
                  </p>
                ) : null}

                {submitMessage ? (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {submitMessage}
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Change Vehicle
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Saving booking..." : "Book My Black Car"}
                  </button>
                </div>
              </div>
            ) : null}
          </form>
        </section>

        <aside className="h-fit rounded-3xl border border-white/10 bg-linear-to-b from-neutral-900 to-black p-6 lg:sticky lg:top-28">
          <h2 className="text-xl font-semibold">Booking Summary</h2>
          <p className="mt-2 text-sm text-neutral-300">Live preview as you complete each step.</p>

          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-neutral-400">Service</p>
              <p className="font-medium">{serviceTypeLabel(formState.serviceType)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-neutral-400">Vehicle</p>
              <p className="font-medium">{selected?.name ?? "Pending selection"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-neutral-400">Route</p>
              <p className="font-medium">{formState.pickupAddress || "—"}</p>
              <p className="my-1 text-xs text-neutral-500">to</p>
              <p className="font-medium">{formState.dropoffAddress || "—"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-neutral-900/70 p-3">
              <p className="text-neutral-400">Departure</p>
              <p className="font-medium">{formState.serviceDate || "—"}</p>
              <p className="text-neutral-300">{formState.pickupTime || "—"}</p>
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

      <VirtualConcierge
        context={{
          bookingStep,
          serviceTypeLabel: serviceTypeLabel(formState.serviceType),
          passengers: formState.passengers,
          selectedVehicleName: selected?.name,
          estimatedFare,
        }}
        onGoToStep={goToStepFromConcierge}
      />
    </div>
  );
}

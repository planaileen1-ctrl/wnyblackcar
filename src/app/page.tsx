"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase";
import { defaultSiteContent, SiteContent } from "@/lib/site-content";

export default function Home() {
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);

  const fleetPhotos = useMemo(
    () =>
      siteContent.fleet.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        capacity: item.seats,
        luggage: item.luggage,
        image: item.image,
        description: item.description,
      })),
    [siteContent.fleet],
  );

  const signatureServices = [
    {
      title: "Airport Transfers",
      description:
        "Guaranteed punctuality at Buffalo Niagara International and regional airports.",
    },
    {
      title: "Corporate Travel",
      description:
        "Professional service for executives who value time, precision and discretion.",
    },
    {
      title: "Special Events",
      description:
        "Arrive with distinction to weddings, galas and private celebrations across WNY.",
    },
    {
      title: "Hourly Service",
      description:
        "Flexible premium vehicle rental for multi-stop schedules and custom itineraries.",
    },
  ];

  const trustItems = ["Premium insured", "24/7 availability", "Coverage across WNY"];

  const todayUsa = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());

  useEffect(() => {
    if (!firestoreDb) {
      return;
    }

    const contentRef = doc(firestoreDb, "siteContent", "main");

    const unsubscribe = onSnapshot(contentRef, (snapshot) => {
      if (!snapshot.exists()) {
        setSiteContent(defaultSiteContent);
        return;
      }

      const data = snapshot.data() as Partial<SiteContent>;

      setSiteContent({
        home: {
          ...defaultSiteContent.home,
          ...(data.home ?? {}),
        },
        booking: {
          ...defaultSiteContent.booking,
          ...(data.booking ?? {}),
        },
        fleet: (data.fleet ?? defaultSiteContent.fleet).map((item, index) => {
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
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-amber-500 selection:text-black">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-white">
              WNY <span className="text-amber-500">BLACK CAR</span>
            </p>
            <p className="text-xs text-neutral-400">Executive Vehicle Rental Experience</p>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm text-neutral-200 transition-colors hover:text-amber-400">
              Home
            </a>
            <a href="#fleet" className="text-sm text-neutral-200 transition-colors hover:text-amber-400">
              Fleet
            </a>
            <a href="#services" className="text-sm text-neutral-200 transition-colors hover:text-amber-400">
              Services
            </a>
            <Link
              href="/booking"
              className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              Book Now
            </Link>
          </nav>

          <p className="hidden text-xs text-neutral-400 lg:block">{todayUsa} • EST</p>
        </div>
      </header>

      <main>
        <section id="home" className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
          <div className="absolute inset-0">
            <div
              className="h-full w-full bg-cover bg-center opacity-35"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=2000)",
              }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <p className="mb-6 inline-block rounded-full bg-amber-500/20 px-4 py-1 text-xs font-semibold tracking-[0.14em] text-amber-400">
              {siteContent.home.heroBadge}
            </p>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              {siteContent.home.heroTitleLine1}
              <br />
              <span className="text-transparent bg-linear-to-r from-white to-neutral-500 bg-clip-text">
                {siteContent.home.heroTitleLine2}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-neutral-300 md:text-xl">
              {siteContent.home.heroDescription}
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/booking"
                className="rounded-full bg-white px-10 py-4 text-base font-bold text-black transition hover:bg-amber-500"
              >
                {siteContent.home.primaryCta}
              </Link>
              <Link
                href="#services"
                className="rounded-full border border-white/20 bg-white/5 px-10 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                {siteContent.home.secondaryCta}
              </Link>
            </div>
          </div>
        </section>

        <section id="fleet" className="scroll-mt-24 bg-neutral-900/50 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-bold">Our Exclusive Fleet</h2>
              <div className="mx-auto mt-5 h-1 w-20 rounded-full bg-amber-500" />
              <p className="mx-auto mt-6 max-w-2xl text-neutral-400">
                Latest-generation vehicles maintained under exceptional standards of comfort,
                cleanliness and safety.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {fleetPhotos.map((car) => (
                <article
                  key={car.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 transition-all duration-500 hover:border-amber-500/50"
                >
                  <div className="relative h-64 overflow-hidden">
                    <div
                      className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${car.image})` }}
                    />
                    <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-amber-400 backdrop-blur">
                      {car.type}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-8">
                    <h3 className="text-2xl font-bold">{car.name}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-400">{car.description}</p>

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5 text-sm text-neutral-300">
                      <span>{car.capacity}</span>
                      <span>{car.luggage}</span>
                    </div>

                    <Link
                      href="/booking"
                      className="mt-7 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-center text-sm font-semibold transition-all hover:bg-amber-500 hover:text-black"
                    >
                      Rent this vehicle
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-24 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="text-4xl font-bold">Signature Services</h2>
              <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
                Tailored transportation built for executives, families and high-profile travel needs.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {signatureServices.map((service) => (
                <article
                  key={service.title}
                  className="rounded-3xl border border-white/5 bg-neutral-900/40 p-8 transition-colors hover:bg-neutral-800/40"
                >
                  <div className="mb-5 h-9 w-9 rounded-full bg-amber-500/20" />
                  <h3 className="text-xl font-bold">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-400">{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-black px-6 py-16">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-around gap-6">
            {trustItems.map((item) => (
              <p key={item} className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-300">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section id="contact" className="relative overflow-hidden bg-neutral-950 px-6 py-24">
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-5xl rounded-[2.2rem] border border-white/10 bg-linear-to-br from-neutral-900 to-black p-8 shadow-2xl md:p-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-4xl font-bold">Ready for your next destination?</h2>
                <p className="mt-5 text-neutral-400">
                  Receive a personalized quote and immediate availability confirmation from our
                  dispatch team.
                </p>

                <div className="mt-8 space-y-4">
                  <p className="text-xl font-semibold text-white">+1 (716) 555-0123</p>
                  <p className="text-neutral-300">reservations@wnyblackcar.com</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-neutral-400">
                  Pickup Location
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-neutral-400">
                  Drop-off Location
                </div>
                <Link
                  href="/booking"
                  className="block rounded-2xl bg-amber-500 px-8 py-4 text-center text-lg font-bold text-black transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                  Get a Quote
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 bg-black px-6 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <p className="text-lg font-semibold">
                WNY <span className="text-amber-500">BLACK CAR</span>
              </p>
              <p className="mt-1 text-sm text-neutral-500">© 2026 Buffalo, New York. All rights reserved.</p>
            </div>

            <div className="flex items-center gap-6 text-sm text-neutral-400">
              <a href="#" className="transition-colors hover:text-white">
                Terms
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Privacy
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Policy
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

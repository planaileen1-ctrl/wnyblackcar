import Link from "next/link";

export default function Home() {
  const fleetPhotos = [
    {
      name: "Chevrolet Suburban",
      seats: "Up to 6 passengers",
      highlight: "Airport & executive transfers",
      rate: "From $145",
      image:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    },
    {
      name: "Executive Sedan",
      seats: "Executive comfort for 3",
      highlight: "Client meetings & city rides",
      rate: "From $120",
      image:
        "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1600&q=80",
    },
    {
      name: "Sprinter Van",
      seats: "Group rides up to 14",
      highlight: "Events & private groups",
      rate: "From $220",
      image:
        "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1600&q=80",
    },
  ];

  const signatureServices = [
    {
      title: "Airport Concierge Transfers",
      description:
        "Flight tracking, coordinated pickup and professional meet-and-greet for seamless arrivals.",
    },
    {
      title: "Corporate Chauffeur Service",
      description:
        "Quiet, punctual transportation for executives, board meetings and VIP guest itineraries.",
    },
    {
      title: "Hourly Private Hire",
      description:
        "Dedicated chauffeur on standby for dinners, events and multi-stop schedules.",
    },
  ];

  const serviceStandards = [
    "Professionally vetted chauffeurs",
    "24/7 live dispatch support",
    "Discreet and private service",
    "Transparent flat-rate pricing",
  ];

  const todayUsa = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(251,191,36,0.14),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(15,23,42,0.9),transparent_45%)]" />

      <header className="relative border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-amber-300">WNY BLACK CAR</p>
            <p className="text-xs text-slate-400">Private Chauffeur & Executive Transportation</p>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <p className="text-xs text-slate-300">{todayUsa} • EST</p>
            <Link
              href="/booking"
              className="rounded-md border border-white/20 px-4 py-2 text-xs font-semibold tracking-wide text-white transition hover:bg-white/10"
            >
              Reserve Now
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-14 pt-10 md:pt-14">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-7">
            <p className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-medium tracking-[0.14em] text-amber-200">
              BUFFALO • NIAGARA FALLS • ROCHESTER
            </p>

            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Chauffeur service designed for executives, families and discerning travelers.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Premium black car transportation with discreet chauffeurs, polished vehicles and precision scheduling.
              From airport arrivals to private events, every detail is handled with care.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/booking"
                className="rounded-lg bg-amber-300 px-5 py-3 text-sm font-semibold tracking-wide text-slate-900 transition hover:bg-amber-200"
              >
                Reserve Your Chauffeur
              </Link>
              <Link
                href="/booking"
                className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold tracking-wide text-slate-100 transition hover:bg-white/10"
              >
                Explore Fleet Classes
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
                <p className="text-lg font-semibold">24/7</p>
                <p className="text-sm text-slate-300">Dedicated dispatch team</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
                <p className="text-lg font-semibold">On-Time</p>
                <p className="text-sm text-slate-300">Flight-aware scheduling</p>
              </article>
              <article className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
                <p className="text-lg font-semibold">Private</p>
                <p className="text-sm text-slate-300">Discreet premium service</p>
              </article>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/40">
            <h2 className="text-xl font-semibold">Priority Reservation</h2>
            <p className="mt-1 text-sm text-slate-300">Receive a fast confirmation from our dispatch team.</p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Pickup</p>
                <p className="mt-1 font-medium text-slate-100">Buffalo Niagara International Airport</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Destination</p>
                <p className="mt-1 font-medium text-slate-100">Downtown Buffalo, NY</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Class</p>
                <p className="mt-1 font-medium text-slate-100">Chevrolet Suburban • 6 passengers</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Estimated Fare</p>
                <p className="mt-1 text-2xl font-semibold text-amber-300">$145 USD</p>
              </div>
            </div>

            <Link
              href="/booking"
              className="mt-5 block w-full rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Continue to Secure Booking
            </Link>
          </aside>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {signatureServices.map((service) => (
            <article key={service.title} className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
              <p className="text-sm font-semibold text-white">{service.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{service.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <p className="text-xs font-medium tracking-[0.16em] text-amber-300">THE WNY STANDARD</p>
            <h3 className="mt-2 text-2xl font-semibold">Built on consistency, discretion and exact timing.</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              {serviceStandards.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <div className="grid gap-4 sm:grid-cols-3">
            {fleetPhotos.map((vehicle) => (
              <article
                key={vehicle.name}
                className="group relative h-52 overflow-hidden rounded-2xl border border-white/10"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${vehicle.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-0 w-full space-y-1 p-4">
                  <p className="text-sm font-semibold text-white">{vehicle.name}</p>
                  <p className="text-xs text-slate-200">{vehicle.seats}</p>
                  <p className="text-xs text-slate-300">{vehicle.highlight}</p>
                  <p className="text-xs font-semibold text-amber-300">{vehicle.rate}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

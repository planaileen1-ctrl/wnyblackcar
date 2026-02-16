export default function Home() {
  const fleetPhotos = [
    {
      name: "Chevrolet Suburban",
      seats: "Up to 6 passengers",
      image:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    },
    {
      name: "Luxury Sedan",
      seats: "Executive comfort for 3",
      image:
        "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1600&q=80",
    },
    {
      name: "Sprinter Van",
      seats: "Group rides up to 14",
      image:
        "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1600&q=80",
    },
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
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-amber-300">
              WNY BLACK CAR
            </p>
            <p className="text-xs text-slate-400">Premium Chauffeur Experience</p>
          </div>
          <p className="text-xs text-slate-300">{todayUsa} • EST</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-16">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-200">
            Airport • Corporate • Private Events
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Executive black car booking for Western New York.
          </h1>
          <p className="max-w-xl text-base text-slate-300 sm:text-lg">
            Book premium rides in minutes with transparent pricing, professional
            chauffeurs, and 24/7 reliability across Buffalo, Niagara Falls, and
            Rochester.
          </p>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200">
              Book a Ride
            </button>
            <button className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10">
              View Fleet
            </button>
          </div>

          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            <article className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <p className="text-2xl font-bold">200+</p>
              <p className="text-sm text-slate-300">Five-star reviews</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-sm text-slate-300">Live booking support</p>
            </article>
            <article className="rounded-xl border border-white/10 bg-slate-900 p-4">
              <p className="text-2xl font-bold">No Surge</p>
              <p className="text-sm text-slate-300">Flat-rate transparency</p>
            </article>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold tracking-wide text-slate-200">
              Featured Fleet
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {fleetPhotos.map((vehicle) => (
                <article
                  key={vehicle.name}
                  className="group relative h-40 overflow-hidden rounded-xl border border-white/10"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${vehicle.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <div className="absolute bottom-0 w-full p-3">
                    <p className="text-sm font-semibold text-white">{vehicle.name}</p>
                    <p className="text-xs text-slate-200">{vehicle.seats}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/30">
          <h2 className="text-xl font-semibold">Quick Booking Snapshot</h2>
          <p className="mt-2 text-sm text-slate-300">
            Professional ride request flow for U.S. customers.
          </p>

          <div className="mt-6 space-y-4 text-sm">
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-slate-400">Pickup</p>
              <p className="font-medium">Buffalo Niagara International Airport</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-slate-400">Drop-off</p>
              <p className="font-medium">Downtown Buffalo, NY</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-slate-400">Vehicle</p>
              <p className="font-medium">Chevrolet Suburban • 6 passengers</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-slate-400">Estimated Fare</p>
              <p className="text-lg font-semibold text-amber-300">$145.00 USD</p>
            </div>
          </div>

          <button className="mt-6 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
            Continue to Secure Checkout
          </button>
        </section>
      </main>
    </div>
  );
}

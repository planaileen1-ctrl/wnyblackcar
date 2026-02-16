import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

type ServiceType = "one-way" | "round-trip" | "hourly";

type CheckoutBody = {
  bookingId?: string;
  vehicleId?: string;
  serviceType?: ServiceType;
  estimatedFare?: number;
  customerName?: string;
  customerEmail?: string;
};

const vehicleBaseFare: Record<string, number> = {
  sedan: 120,
  suv: 145,
  sprinter: 220,
};

const serviceMultiplier: Record<ServiceType, number> = {
  "one-way": 1,
  "round-trip": 2,
  hourly: 3,
};

const serviceLabel: Record<ServiceType, string> = {
  "one-way": "One Way",
  "round-trip": "Round Trip",
  hourly: "Hourly",
};

const vehicleLabel: Record<string, string> = {
  sedan: "Luxury Sedan",
  suv: "Premium SUV",
  sprinter: "Executive Van",
};

export async function POST(request: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Stripe is not configured. Missing STRIPE_SECRET_KEY." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as CheckoutBody;

    if (!body.bookingId || !body.vehicleId || !body.serviceType) {
      return NextResponse.json(
        { error: "Missing required checkout fields." },
        { status: 400 },
      );
    }

    if (!(body.vehicleId in vehicleBaseFare) || !(body.serviceType in serviceMultiplier)) {
      return NextResponse.json({ error: "Invalid vehicle or service type." }, { status: 400 });
    }

    const fallbackAmountUsd = vehicleBaseFare[body.vehicleId] * serviceMultiplier[body.serviceType];
    const estimatedFareFromRequest = Number(body.estimatedFare ?? 0);
    const amountUsd =
      Number.isFinite(estimatedFareFromRequest) && estimatedFareFromRequest > 0
        ? estimatedFareFromRequest
        : fallbackAmountUsd;
    const unitAmount = Math.round(amountUsd * 100);

    if (unitAmount <= 0) {
      return NextResponse.json({ error: "Invalid checkout amount." }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecretKey);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/booking?checkout=success&bookingId=${body.bookingId}`,
      cancel_url: `${appUrl}/booking?checkout=cancelled&bookingId=${body.bookingId}`,
      customer_email: body.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: `${vehicleLabel[body.vehicleId]} · ${serviceLabel[body.serviceType]}`,
              description: "WNY Black Car premium reservation",
            },
          },
        },
      ],
      metadata: {
        bookingId: body.bookingId,
        vehicleId: body.vehicleId,
        serviceType: body.serviceType,
        customerName: body.customerName ?? "",
        customerEmail: body.customerEmail ?? "",
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create Stripe checkout session.",
      },
      { status: 500 },
    );
  }
}

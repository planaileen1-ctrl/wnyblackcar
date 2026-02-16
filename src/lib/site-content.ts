export type SiteFleetItem = {
  id: string;
  name: string;
  type: string;
  seats: string;
  luggage: string;
  image: string;
  description: string;
  baseFare: number;
};

export type SiteContent = {
  home: {
    heroBadge: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroDescription: string;
    primaryCta: string;
    secondaryCta: string;
  };
  booking: {
    formTitle: string;
    formSubtitle: string;
  };
  fleet: SiteFleetItem[];
};

export const defaultSiteContent: SiteContent = {
  home: {
    heroBadge: "PREMIUM SERVICE IN WESTERN NEW YORK",
    heroTitleLine1: "Travel with distinction.",
    heroTitleLine2: "Arrive with precision.",
    heroDescription:
      "Elegance, discretion and professionalism in every mile. Specialists in executive transportation, airport transfers and private event mobility.",
    primaryCta: "Rent Your Vehicle",
    secondaryCta: "View Services",
  },
  booking: {
    formTitle: "Reserve Your Vehicle",
    formSubtitle:
      "Complete your trip details and our dispatch team will confirm availability promptly.",
  },
  fleet: [
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
  ],
};

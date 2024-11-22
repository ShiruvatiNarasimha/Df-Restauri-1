// Helper function to ensure images go through WebP conversion
export const getImagePath = (path: string) => {
  // If it's an external URL, return as is
  if (path.startsWith('http')) {
    return path;
  }
  // Otherwise, let the server handle WebP conversion
  return path;
};

export const STOCK_PHOTOS = {
  construction: [
    getImagePath("/images/construction/construction-1.jpg"),
    "https://pixabay.com/get/g3a95080cb828ce68289ec3c88587352a22c25fc7210ac46c3c8d8080476d808dfd3e2ea3ccd65981aebb9e4e04f6286a4cddf09ffc9b68f358e1db3822cb0a3c_1280.jpg",
    "https://pixabay.com/get/g3e39273f1c5e6778993f68a6ce37142a2d68eeaa35082c5f9806b27eccaad3c92f8a5b5b7be16e42dd55b68b92a023facdbbf1a22e2595f9c3f3b718c6487cc7_1280.jpg"
  ],
  restoration: [
    getImagePath("/images/chi-siamo/about-company.jpeg"),
    "https://pixabay.com/get/g8927a4d229ca62e7b5a2970ad16bdfd5e94cc299537f980b5d5f5db3b2f9dec18000c0894b0e6614bc91a1b11dd9c66ab416aa7b9956222d2f8b3bee17ed19e3_1280.jpg",
    "https://pixabay.com/get/gb6f2845de6e8e9bb531cf4c4e3f2020259e195d0147d1a7f96902c20b38cf92080028b77a12c0b623320a3fe0eaf3ccf5e3c475c38ac00721f99a145426ee038_1280.jpg"
  ],
  renovation: [
    getImagePath("/images/renovation/renovation-1.jpg"),
    getImagePath("/images/renovation/renovation-2.jpg")
  ],
  about: getImagePath("/images/chi-siamo/about-company.jpeg")
};

export const NAVIGATION_ITEMS = [
  { 
    label: "Home",
    href: "/" 
  },
  {
    label: "Menu",
    href: "#",
    items: [
      { label: "Ci Presentiamo", href: "/ci-presentiamo" },
      { label: "Servizi", href: "/servizi" },
      { label: "Certificazioni", href: "#certificazioni" },
      { label: "Sostenibilita", href: "/sostenibilita" },
      { label: "Realizzazioni", href: "/realizzazioni" }
    ]
  }
];

export const TEAM_MEMBERS = [
  {
    name: "Marco Rossi",
    role: "Direttore Tecnico",
    avatar: "https://i.pravatar.cc/300?img=1",
    social: {
      facebook: "#",
      twitter: "#",
      instagram: "#"
    }
  },
  {
    name: "Laura Bianchi",
    role: "Architetto",
    avatar: "https://i.pravatar.cc/300?img=2",
    social: {
      facebook: "#",
      twitter: "#",
      instagram: "#"
    }
  },
  {
    name: "Giuseppe Verdi",
    role: "Capo Cantiere",
    avatar: "https://i.pravatar.cc/300?img=3",
    social: {
      facebook: "#",
      twitter: "#",
      instagram: "#"
    }
  }
];

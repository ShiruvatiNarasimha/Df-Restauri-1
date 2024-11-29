// Helper function to ensure images go through WebP conversion
const getImagePath = (path: string) => {
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
    getImagePath("/images/construction/construction-2.jpg"),
    getImagePath("/images/construction/construction-3.jpg")
  ],
  restoration: [
    getImagePath("/images/restoration/CANTIERE-2.webp.jpeg"),
    getImagePath("/images/restoration/02249074-f62f-4668-8f61-700e9807b7d6.JPG"),
    getImagePath("/images/restoration/con-work-1-830x519.jpg")
  ],
  renovation: [
    getImagePath("/images/renovation/renovation-1.jpg"),
    getImagePath("/images/renovation/renovation-2.jpg")
  ],
  about: getImagePath("/images/chi-siamo/about-company.jpg")
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
    name: "De Faveri Luca",
    role: "Direttore Tecnico",
    avatar: "https://replit.com/t/immerzo/repls/CostruzioniModerneWeb#FOTO%20DE%20FAVERI.png",
    social: {
      facebook: "#",
      twitter: "#",
      instagram: "#"
    }
  },
  {
    name: "Blasutig Gianalberto",
    role: "Architetto",
    avatar: "/home/runner/CostruzioniModerneWeb/PHOTO-2024-11-28-07-54-131.jpg",
    social: {
      facebook: "#",
      twitter: "#",
      instagram: "#"
    }
  },
  {
    name: "Giuseppe Verdi",
    role: "Capo Cantiere",
    avatar: "/home/runner/CostruzioniModerneWeb/PHOTO-2024-11-28-07-54-131.jpg",
    social: {
      facebook: "#",
      twitter: "#",
      instagram: "#"
    }
  }
];

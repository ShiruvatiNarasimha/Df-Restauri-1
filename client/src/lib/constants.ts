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
    getImagePath("/images/restoration/restoration-1.jpg"),
    getImagePath("/images/restoration/restoration-2.jpg"),
    getImagePath("/images/restoration/restoration-3.jpg")
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

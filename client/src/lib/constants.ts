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
    "https://pixabay.com/get/g3a95080cb828ce68289ec3c88587352a22c25fc7210ac46c3c8d8080476d808dfd3e2ea3ccd65981aebb9e4e04f6286a4cddf09ffc9b68f358e1db3822cb0a3c_1280.jpg",
    "https://pixabay.com/get/g3e39273f1c5e6778993f68a6ce37142a2d68eeaa35082c5f9806b27eccaad3c92f8a5b5b7be16e42dd55b68b92a023facdbbf1a22e2595f9c3f3b718c6487cc7_1280.jpg"
  ],
  restoration: [
    "/images/restauro/IMG_2607.JPG",
    "/images/restauro/IMG_2608.JPG",
    "/images/restauro/IMG_2609.JPG",
    "/images/restauro/IMG_2617.JPG",
    "/images/restauro/IMG_2618.JPG",
    "/images/restauro/IMG_2619.JPG",
    "/images/restauro/IMG_2620 2.JPG"
  ],
  renovation: [
    "https://pixabay.com/get/gddfc05b7a6e6c54d294a7ed171feeab98999d536e1daac9a298492fe716c3277fe60dfdb23b0b1b59f46a3a72f04ec74babf2273c1a9f1bbf09feba99dd4005f_1280.jpg",
    "https://pixabay.com/get/gc92d5d4f7a9e12c26b730f7c5ae267d44a0c7d38ba451a17011a0dfd32a4bae2608b6f8a30ab096ff3e3c1d7b96846a24fda806bf40ca7373dde9c3ba6d0ecfd_1280.jpg"
  ],
  about: "/images/chi-siamo/about-company.jpeg"
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

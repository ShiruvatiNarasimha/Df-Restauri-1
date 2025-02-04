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
  ],
  restoration: [
    "/images/chi-siamo/about-company.jpeg",
    "https://pixabay.com/get/gb6f2845de6e8e9bb531cf4c4e3f2020259e195d0147d1a7f96902c20b38cf92080028b77a12c0b623320a3fe0eaf3ccf5e3c475c38ac00721f99a145426ee038_1280.jpg"
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
      { label: "Sostenibilita", href: "/sostenibilita" },
      { label: "Realizzazioni", href: "/realizzazioni" }
    ]
  }
];

 
   
    
     

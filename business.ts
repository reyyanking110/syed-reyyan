// ──────────────────────────────────────────────────────────────────────────
// Nanna Foods — single source of truth for business/demo content.
// Edit the values below to update the entire website. Nothing in this file
// should be treated as officially confirmed by the restaurant until the
// owner reviews and approves it — this is an unsolicited sales demo built
// by Reyyan Graphix Designz.
// ──────────────────────────────────────────────────────────────────────────

export const siteConfig = {
  isDemo: true,
  demoNotice:
    "This is an unofficial concept website created by Reyyan Graphix Designz to demonstrate web design services. It is not yet affiliated with or published by Nanna Foods.",
  agency: {
    name: "Reyyan Graphix Designz",
  },
};

export const business = {
  nameEn: "Nanna Foods",
  nameUr: "ننھا فوڈز",
  tagline: "Karachi's Flame-Grilled Favourites",
  taglineUr: "ذائقے جو دل جیت لیں",
  shortDescription:
    "A neighbourhood favourite in North Karachi serving BBQ, burgers, rolls, sandwiches and broast — made fresh, served hot.",
  about: {
    heading: "Grilled fresh. Served with love.",
    paragraphs: [
      "Tucked near Nagan Chowrangi in North Karachi, Nanna Foods has been a go-to spot for locals craving honest, flavour-packed fast food — from sizzling BBQ skewers to crispy broast and loaded rolls.",
      "Every order is prepared to order on charcoal grills and hot griddles, using the same recipes the neighbourhood has come to recognise. No shortcuts, no frills — just hearty Karachi-style street food done right.",
      "This page is a design concept prepared by Reyyan Graphix Designz to show Nanna Foods how a modern, mobile-friendly website could look and feel for their brand.",
    ],
  },
  location: {
    addressLine1: "Near Nagan Chowrangi, Sector 11-E",
    addressLine2: "North Karachi, Karachi, Pakistan",
    area: "North Karachi",
    city: "Karachi",
    // A search-based Google Maps link is used instead of invented GPS
    // coordinates, since exact coordinates have not been field-verified.
    mapsSearchUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent("Nanna Foods, Near Nagan Chowrangi, Sector 11-E, North Karachi, Karachi"),
    mapsEmbedQuery: encodeURIComponent("Nagan Chowrangi, Sector 11-E, North Karachi, Karachi, Pakistan"),
  },
  contact: {
    // ⚠️ PLACEHOLDER — not an official Nanna Foods number.
    // Replace with the restaurant's confirmed WhatsApp/phone number before
    // this site is ever shared publicly or goes live.
    whatsappNumber: "923000000000",
    whatsappIsPlaceholder: true,
    whatsappMessage: "Assalam-o-Alaikum! I'd like to place an order from Nanna Foods.",
    phoneDisplay: "Contact number to be confirmed",
  },
  hours: {
    // Verified public opening hours were not available at the time this
    // demo was built. Replace `isVerified: true` and fill in real hours
    // once confirmed directly with the restaurant.
    isVerified: false,
    note: "Please call or WhatsApp to confirm today's opening hours.",
    sample: [
      { day: "Everyday", time: "To be confirmed by Nanna Foods" },
    ],
  },
  social: {
    // Verified via a public Facebook business listing for "Nanna Foods".
    facebookUrl: "https://www.facebook.com/NannaFoodsPk/",
  },
};

export type MenuCategoryId = "bbq" | "burgers" | "rolls" | "sandwiches" | "broast";

export const categories: { id: MenuCategoryId; label: string; labelUr: string; image: string }[] = [
  {
    id: "bbq",
    label: "BBQ",
    labelUr: "باربی کیو",
    image:
      "https://images.pexels.com/photos/29259327/pexels-photo-29259327.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600",
  },
  {
    id: "burgers",
    label: "Burgers",
    labelUr: "برگر",
    image:
      "https://images.pexels.com/photos/32807693/pexels-photo-32807693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600",
  },
  {
    id: "rolls",
    label: "Rolls",
    labelUr: "رولز",
    image:
      "https://images.pexels.com/photos/6416559/pexels-photo-6416559.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600",
  },
  {
    id: "sandwiches",
    label: "Sandwiches",
    labelUr: "سینڈوچ",
    image:
      "https://images.pexels.com/photos/36961392/pexels-photo-36961392.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600",
  },
  {
    id: "broast",
    label: "Broast",
    labelUr: "بروسٹ",
    image:
      "https://images.pexels.com/photos/30709506/pexels-photo-30709506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600",
  },
];

export interface MenuItem {
  id: string;
  name: string;
  nameUr?: string;
  category: MenuCategoryId;
  description: string;
  price: number;
  image: string;
  popular?: boolean;
  spicy?: boolean;
}

// NOTE: Prices below are illustrative sample figures for demo/layout
// purposes only. They are NOT confirmed official Nanna Foods pricing.
export const menuItems: MenuItem[] = [
  {
    id: "beef-seekh-kebab",
    name: "Beef Seekh Kebab",
    category: "bbq",
    description: "Hand-minced beef skewers, charcoal-grilled with house spices and fresh herbs.",
    price: 350,
    image:
      "https://images.pexels.com/photos/29259327/pexels-photo-29259327.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=900",
    popular: true,
    spicy: true,
  },
  {
    id: "chicken-tikka-boti",
    name: "Chicken Tikka Boti",
    category: "bbq",
    description: "Boneless chicken chunks marinated overnight, grilled to smoky perfection.",
    price: 380,
    image:
      "https://images.pexels.com/photos/12738458/pexels-photo-12738458.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=900",
    popular: true,
  },
  {
    id: "bbq-platter",
    name: "Nanna BBQ Platter",
    category: "bbq",
    description: "A generous mix of seekh kebab, tikka boti and grilled sides — made for sharing.",
    price: 950,
    image:
      "https://images.pexels.com/photos/16014227/pexels-photo-16014227.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=900",
  },
  {
    id: "zinger-burger",
    name: "Zinger Burger",
    category: "burgers",
    description: "Crispy fried chicken fillet, lettuce and signature mayo in a toasted bun.",
    price: 320,
    image:
      "https://images.pexels.com/photos/5041475/pexels-photo-5041475.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
    popular: true,
    spicy: true,
  },
  {
    id: "beef-burger-deluxe",
    name: "Beef Burger Deluxe",
    category: "burgers",
    description: "Juicy grilled beef patty with melted cheese, pickles and house sauce.",
    price: 350,
    image:
      "https://images.pexels.com/photos/23106708/pexels-photo-23106708.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
  },
  {
    id: "crispy-chicken-burger",
    name: "Crispy Chicken Burger",
    category: "burgers",
    description: "Golden fried chicken, crunchy slaw and tangy sauce stacked high.",
    price: 300,
    image:
      "https://images.pexels.com/photos/32807693/pexels-photo-32807693.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
  },
  {
    id: "chicken-shawarma-roll",
    name: "Chicken Shawarma Roll",
    category: "rolls",
    description: "Grilled chicken strips rolled in warm paratha with garlic sauce and salad.",
    price: 220,
    image:
      "https://images.pexels.com/photos/6416559/pexels-photo-6416559.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
    popular: true,
  },
  {
    id: "beef-seekh-roll",
    name: "Beef Seekh Roll",
    category: "rolls",
    description: "Spiced beef seekh kebab wrapped in paratha with chutney and onions.",
    price: 240,
    image:
      "https://images.pexels.com/photos/29306500/pexels-photo-29306500.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
  },
  {
    id: "crispy-chicken-roll",
    name: "Crispy Chicken Roll",
    category: "rolls",
    description: "Crunchy fried chicken fillet rolled up with fresh veggies and mayo-chili sauce.",
    price: 230,
    image:
      "https://images.pexels.com/photos/10361459/pexels-photo-10361459.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
  },
  {
    id: "club-sandwich",
    name: "Club Sandwich",
    category: "sandwiches",
    description: "Triple-layered grilled sandwich with chicken, egg, and crisp vegetables.",
    price: 280,
    image:
      "https://images.pexels.com/photos/36961392/pexels-photo-36961392.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
    popular: true,
  },
  {
    id: "grilled-cheese-sandwich",
    name: "Grilled Chicken & Cheese Sandwich",
    category: "sandwiches",
    description: "Melted cheese and seasoned chicken pressed between buttery toasted bread.",
    price: 250,
    image:
      "https://images.pexels.com/photos/31744871/pexels-photo-31744871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
  },
  {
    id: "broast-2pc",
    name: "Broast Chicken (2 Pc)",
    category: "broast",
    description: "Crispy golden broasted chicken served with fries and signature garlic sauce.",
    price: 420,
    image:
      "https://images.pexels.com/photos/20003199/pexels-photo-20003199.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
    popular: true,
  },
  {
    id: "broast-platter",
    name: "Broast Family Platter",
    category: "broast",
    description: "A sharing platter of crispy broast pieces with fries, dips and fresh salad.",
    price: 1100,
    image:
      "https://images.pexels.com/photos/30709506/pexels-photo-30709506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=900",
  },
];

export const galleryImages: { src: string; alt: string }[] = [
  {
    src: "https://images.pexels.com/photos/29358856/pexels-photo-29358856.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1000",
    alt: "Skewered kebabs grilling over open charcoal flames",
  },
  {
    src: "https://images.pexels.com/photos/17312401/pexels-photo-17312401.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1000",
    alt: "Grilled meat skewers served with fresh salad",
  },
  {
    src: "https://images.pexels.com/photos/27643033/pexels-photo-27643033.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1000",
    alt: "Juicy grilled platter with fries and vegetables",
  },
  {
    src: "https://images.pexels.com/photos/37113985/pexels-photo-37113985.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1000",
    alt: "Chef grilling skewers in a smoky open kitchen",
  },
  {
    src: "https://images.pexels.com/photos/5946428/pexels-photo-5946428.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=1000",
    alt: "Bowl of crispy golden french fries",
  },
  {
    src: "https://images.pexels.com/photos/29684985/pexels-photo-29684985.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=1000",
    alt: "Spicy chicken curry served in a traditional kadai",
  },
  {
    src: "https://images.pexels.com/photos/6876621/pexels-photo-6876621.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1000",
    alt: "Warm, cozy restaurant seating area",
  },
  {
    src: "https://images.pexels.com/photos/12181619/pexels-photo-12181619.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1000",
    alt: "Guests enjoying a meal together at a restaurant",
  },
];

export const heroImage =
  "https://images.pexels.com/photos/5779781/pexels-photo-5779781.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=1600";

export const aboutImage =
  "https://images.pexels.com/photos/15945660/pexels-photo-15945660.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1000&w=1200";

export function buildWhatsAppLink(message?: string) {
  const text = encodeURIComponent(message ?? business.contact.whatsappMessage);
  return `https://wa.me/${business.contact.whatsappNumber}?text=${text}`;
}

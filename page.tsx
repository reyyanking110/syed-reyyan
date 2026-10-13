import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import MenuSection from "@/components/MenuSection";
import Gallery from "@/components/Gallery";
import About from "@/components/About";
import LocationSection from "@/components/LocationSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";
import { business } from "@/data/business";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: business.nameEn,
  servesCuisine: ["Pakistani", "Fast Food", "BBQ"],
  address: {
    "@type": "PostalAddress",
    streetAddress: business.location.addressLine1,
    addressLocality: business.location.area,
    addressRegion: "Sindh",
    addressCountry: "PK",
  },
  url: "https://nanna-foods-demo.vercel.app",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Hero />
        <Categories />
        <MenuSection />
        <Gallery />
        <About />
        <LocationSection />
        <ContactSection />
      </main>
      <Footer />
      <WhatsAppFloatingButton />
    </>
  );
}

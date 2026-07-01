import { ArrowUpRight, BadgeCheck, HeartHandshake, PackageCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resolveAssetUrl } from "../../shared/api/client";
import { getProducts } from "../../shared/api/productsApi";
import { demoProducts } from "../../shared/data/demoProducts";

const content = {
  eyebrow: "Premium beauty products",
  title: "Beauty Store",
  description: "Discover luxury skincare and makeup crafted for radiant, glowing skin.",
  cta: "Shop Now",
  featuredTitle: "Our Products",
  featuredText: "Discover our premium beauty products crafted with natural, fresh ingredients.",
};

const fallbackProducts = demoProducts.slice(0, 8);

const benefits = [
  {
    title: "Fast delivery",
    text: "Free shipping on orders",
    icon: Truck,
  },
  {
    title: "Online shop",
    text: "Easy secure purchases",
    icon: PackageCheck,
  },
  {
    title: "Great value",
    text: "Premium quality at fair prices",
    icon: BadgeCheck,
  },
  {
    title: "Trusted care",
    text: "Selected with beauty in mind",
    icon: HeartHandshake,
  },
];

export default function HomePage() {
  const [products, setProducts] = useState(fallbackProducts);

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedProducts() {
      try {
        const data = await getProducts({ limit: 8 });
        if (isMounted && data.length > 0) {
          setProducts(data);
        }
      } catch {
        if (isMounted) {
          setProducts(fallbackProducts);
        }
      }
    }

    loadFeaturedProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main>
      <section className="home-hero" aria-labelledby="home-title">
        <img
          className="home-hero-image"
          src="/home-page.png"
          alt="Beauty products including skincare, perfume, and lipstick"
          fetchPriority="high"
        />
        <div className="site-container home-hero-content">
          <p className="home-eyebrow">{content.eyebrow}</p>
          <h1 id="home-title">{content.title}</h1>
          <p className="home-hero-description">{content.description}</p>
          <Link className="primary-link" to="/products">
            <span>{content.cta}</span>
            <ArrowUpRight aria-hidden="true" size={19} strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      <section className="featured-products" aria-labelledby="featured-products-title">
        <div className="site-container featured-products-header">
          <h2 id="featured-products-title">{content.featuredTitle}</h2>
          <p>{content.featuredText}</p>
        </div>
        <div className="site-container featured-products-grid">
          {products.map((product, index) => {
            const productPath = product.id ? `/products/${product.id}` : "/products";
            const productImage = resolveAssetUrl(product.image_url || fallbackProducts[index % fallbackProducts.length].image_url);
            const productPrice = Number.isFinite(Number(product.price))
              ? `${Number(product.price).toLocaleString("en-US")} MRU`
              : product.price;

            return (
            <article className="featured-product-card" key={product.id || product.name}>
              <Link className="featured-product-image" to={productPath} aria-label={`View ${product.name}`}>
                <img src={productImage} alt={product.name} loading="lazy" />
              </Link>
              <div className="featured-product-info">
                <h3>{product.name}</h3>
                <span>{productPrice}</span>
              </div>
            </article>
            );
          })}
        </div>
      </section>

      <section id="about" className="home-benefits" aria-label="Store benefits">
        <div className="site-container home-benefits-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article className="home-benefit" key={benefit.title}>
                <Icon aria-hidden="true" size={22} strokeWidth={1.6} />
                <div>
                  <h2>{benefit.title}</h2>
                  <p>{benefit.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

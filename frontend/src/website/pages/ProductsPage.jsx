import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resolveAssetUrl } from "../../shared/api/client";
import { getProducts } from "../../shared/api/productsApi";
import { demoProductImages, demoProducts } from "../../shared/data/demoProducts";

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function getProductImage(product, index) {
  return resolveAssetUrl(product.image_url || demoProductImages[index % demoProductImages.length]);
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const data = await getProducts({ limit: 24 });
        if (isMounted) {
          setProducts(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError("");
          setProducts(demoProducts);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="shop-page shop-page--catalog">
      <section className="site-container shop-catalog-header" aria-labelledby="shop-title">
        <h1 id="shop-title">Our Products</h1>
        <p>Discover our premium hemp-based skincare range, crafted with natural, fresh ingredients.</p>
      </section>

      {isLoading && (
        <section className="site-container shop-state" aria-live="polite">
          <p>Loading products...</p>
        </section>
      )}

      {error && (
        <section className="site-container shop-state shop-state--error" role="alert">
          <p>{error}</p>
        </section>
      )}

      {!isLoading && !error && (
        <section className="site-container shop-catalog-grid" aria-label="Products">
          {products.map((product, index) => (
            <article className="shop-catalog-card" key={product.id}>
              <Link className="shop-catalog-image" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
                <img src={getProductImage(product, index)} alt={product.name} loading="lazy" />
              </Link>
              <h2>{product.name}</h2>
              <span>{formatCurrency(product.price)}</span>
            </article>
          ))}
        </section>
      )}

      {!isLoading && !error && products.length === 0 && (
        <section className="site-container shop-state">
          <p>No products found.</p>
        </section>
      )}

      <div className="site-container shop-load-more">
        <Link to="/products" aria-label="Load more products">Load More Products</Link>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../api/productsApi";

const fallbackImages = [
  "/file_00000000024471f4824f92dd1a4e6d44.png",
  "/file_000000002fb071f4846f3e2aef16d40d.png",
  "/file_000000004c4871f491e266b7761a04f7.png",
  "/file_000000004e3c71f4b89cdba210b3c5b6.png",
  "/file_00000000a0c071f48d3ada2e41d3f6ad.png",
  "/file_00000000a48871f48d57f1e017fd30b2.png",
];

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function getProductImage(product, index) {
  return product.image_url || fallbackImages[index % fallbackImages.length];
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
          setError(requestError.message);
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

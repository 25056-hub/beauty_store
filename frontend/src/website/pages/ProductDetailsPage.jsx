import { ChevronDown, Heart, Leaf, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addToCart } from "../../shared/api/cartApi";
import { isAuthenticated, resolveAssetUrl } from "../../shared/api/client";
import { getProduct } from "../../shared/api/productsApi";
import { useCart } from "../../shared/context/CartContext";
import { demoProductImages } from "../../shared/data/demoProducts";
import { addGuestCartItem } from "../../shared/utils/guestCart";

const productServices = [
  {
    title: "Free shipping over 12,000 MRU",
    text: "Fast and reliable delivery",
    icon: Truck,
  },
  {
    title: "100% secure payment",
    text: "Your data is protected",
    icon: ShieldCheck,
  },
  {
    title: "Returns within 4 days",
    text: "Easy returns for unopened items",
    icon: RotateCcw,
  },
];

const productSections = ["Product Details", "How to Use", "Ingredients"];

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

function getProductImage(product) {
  const fallbackIndex = Number(product.id || 1) % demoProductImages.length;
  return resolveAssetUrl(product.image_url || demoProductImages[fallbackIndex]);
}

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const { refreshCartCount } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setError("");
      setQuantity(1);

      try {
        const data = await getProduct(productId);
        if (isMounted) {
          setProduct(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message);
          setProduct(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <main className="product-details-page">
        <section className="site-container shop-state" aria-live="polite">
          <p>Loading product...</p>
        </section>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="product-details-page">
        <section className="site-container product-not-found">
          <p className="home-eyebrow">Product</p>
          <h1>Product not found</h1>
          {error && <p>{error}</p>}
          <Link to="/products">Back to products</Link>
        </section>
      </main>
    );
  }

  const decreaseQuantity = () => setQuantity((value) => Math.max(1, value - 1));
  const increaseQuantity = () => setQuantity((value) => Math.min(product.stock, value + 1));
  const handleAddToCart = async () => {
    setCartMessage("");
    setCartError("");
    setIsAddingToCart(true);

    try {
      if (isAuthenticated()) {
        await addToCart(product.id, quantity);
      } else {
        addGuestCartItem(product, quantity);
      }
      await refreshCartCount();
      setCartMessage("Product added to cart.");
    } catch (requestError) {
      setCartError(requestError.message);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const productDescription = product.description || "More product information will be added soon.";
  const rating = "4.8";
  const reviews = 86;

  return (
    <main className="product-details-page">
      <section className="site-container product-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/products">Shop</Link>
        <span>/</span>
        <strong>{product.name}</strong>
      </section>

      <section className="site-container product-details-grid">
        <div className="product-details-media">
          <img src={getProductImage(product)} alt={product.name} />
        </div>

        <div className="product-details-content">
          <p className="home-eyebrow">Category {product.category_id}</p>
          <h1>{product.name}</h1>
          <div className="product-rating" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} aria-hidden="true" size={15} fill="currentColor" strokeWidth={1.6} />
            ))}
            <span>{rating} ({reviews} reviews)</span>
          </div>
          <strong>{formatCurrency(product.price)}</strong>
          <p>{productDescription}</p>
          <p className="product-stock-note">
            <Heart aria-hidden="true" size={15} strokeWidth={1.8} />
            Only {product.stock} left in stock
          </p>

          <div className="product-actions">
            <div className="quantity-stepper" aria-label="Quantity">
              <button type="button" onClick={decreaseQuantity} aria-label="Decrease quantity">
                <Minus aria-hidden="true" size={16} />
              </button>
              <span>{quantity}</span>
              <button type="button" onClick={increaseQuantity} aria-label="Increase quantity">
                <Plus aria-hidden="true" size={16} />
              </button>
            </div>
            <button className="product-add-button" type="button" onClick={handleAddToCart} disabled={isAddingToCart}>
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.8} />
              {isAddingToCart ? "Adding..." : "Add to Cart"}
            </button>
          </div>

          {cartMessage && <p className="product-action-message">{cartMessage}</p>}
          {cartError && <p className="product-action-message product-action-message--error" role="alert">{cartError}</p>}

          <div className="product-service-row" aria-label="Product services">
            {productServices.map((service) => {
              const Icon = service.icon;

              return (
                <article key={service.title}>
                  <Icon aria-hidden="true" size={20} strokeWidth={1.6} />
                  <div>
                    <h2>{service.title}</h2>
                    <p>{service.text}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="product-accordions">
            {productSections.map((section, index) => (
              <details key={section} open={index === 0}>
                <summary>
                  <span>
                    <Leaf aria-hidden="true" size={16} strokeWidth={1.6} />
                    {section}
                  </span>
                  <ChevronDown aria-hidden="true" size={17} strokeWidth={1.8} />
                </summary>
                <p>{index === 0 ? productDescription : "More product information will be added here."}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

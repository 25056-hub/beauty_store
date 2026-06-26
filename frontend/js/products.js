// Ce fichier affiche les produits et applique le filtrage par categorie.
// Les donnees sont locales pour que le site fonctionne meme sans backend.
const products = [
  {
    id: 1,
    name: "Vitamin C Serum 30%",
    brand: "The Ordinary",
    category: "skincare",
    price: 890,
    oldPrice: 1200,
    badge: "Bestseller",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=700&auto=format&fit=crop",
    description: "A brightening serum that helps improve skin texture and gives the face a healthy glow."
  },
  {
    id: 2,
    name: "Lipstick - Ruby Woo",
    brand: "MAC Cosmetics",
    category: "makeup",
    price: 145,
    oldPrice: null,
    badge: "New",
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=700&auto=format&fit=crop",
    description: "A bold red lipstick with a smooth finish, perfect for classic and elegant makeup looks."
  },
  {
    id: 3,
    name: "Chanel N5 - 100ml",
    brand: "Chanel",
    category: "perfume",
    price: 650,
    oldPrice: 780,
    badge: "Luxury",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=700&auto=format&fit=crop",
    description: "A luxury perfume with a timeless floral scent suitable for special evenings and daily elegance."
  },
  {
    id: 4,
    name: "Cicaplast Baume B5",
    brand: "La Roche-Posay",
    category: "skincare",
    price: 750,
    oldPrice: 1050,
    badge: "Off 30%",
    image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=700&auto=format&fit=crop",
    description: "A repairing moisturizer that helps calm dry skin and supports the skin barrier."
  },
  {
    id: 5,
    name: "Rose Quartz Foundation",
    brand: "Huda Beauty",
    category: "makeup",
    price: 2800,
    oldPrice: null,
    badge: "Premium",
    image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=700&auto=format&fit=crop",
    description: "A smooth foundation that gives even coverage and a polished makeup base."
  },
  {
    id: 6,
    name: "Elixir Ultime Shampoo",
    brand: "Kerastase",
    category: "hair",
    price: 1950,
    oldPrice: 2300,
    badge: "New",
    image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&auto=format&fit=crop",
    description: "A nourishing shampoo designed to add shine and softness while caring for dry hair."
  }
];

// Rend la liste disponible pour la page product.html.
window.products = products;

const productsGrid = document.getElementById("productsGrid");
const filterButtons = document.querySelectorAll(".filter-btn");

// Evite l'injection HTML lorsque les valeurs viennent d'une source externe.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Formate le prix avec la monnaie utilisee dans la boutique.
function formatPrice(value) {
  return `${Number(value).toLocaleString("fr-FR")} Mru`;
}

// Transforme un produit en carte HTML.
function createProductCard(product) {
  return `
    <article class="product-card" data-category="${escapeHtml(product.category)}">
      ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
      <div class="product-img">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
        <div class="product-actions">
          <button class="action-btn" type="button" aria-label="Add to wishlist">
            <i class="fas fa-heart"></i>
          </button>
          <button class="action-btn add-to-cart" type="button" aria-label="Add to cart">
            <i class="fas fa-shopping-bag"></i>
          </button>
          <a class="action-btn" href="product.html?id=${product.id}" aria-label="View details">
            <i class="fas fa-eye"></i>
          </a>
        </div>
      </div>
      <div class="product-info">
        <p class="product-brand">${escapeHtml(product.brand)}</p>
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <div class="product-rating" aria-label="Rating 4.5 out of 5">
          <span class="stars">
            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
          </span>
          <span class="rating-count">(128)</span>
        </div>
        <div class="product-price">
          <span class="current-price">${formatPrice(product.price)}</span>
          ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ""}
        </div>
      </div>
    </article>
  `;
}

// Affiche les produits dans la grille principale.
function renderProducts(list) {
  if (!productsGrid) return;

  productsGrid.innerHTML = list.map(createProductCard).join("");
}

// Active le filtre selectionne et recharge la grille.
function filterProducts(category) {
  const filteredProducts = category === "all"
    ? products
    : products.filter((product) => product.category === category);

  renderProducts(filteredProducts);
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    filterProducts(button.dataset.filter);
  });
});

// Gere l'ajout au panier avec un seul ecouteur pour toutes les cartes.
if (productsGrid) {
  renderProducts(products);

  productsGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".add-to-cart");
    if (!button) return;

    const cartCount = document.getElementById("cartCount");
    if (cartCount) {
      cartCount.textContent = String(Number(cartCount.textContent || 0) + 1);
    }

    button.innerHTML = '<i class="fas fa-check"></i>';
    button.disabled = true;

    setTimeout(() => {
      button.innerHTML = '<i class="fas fa-shopping-bag"></i>';
      button.disabled = false;
    }, 1200);
  });
}

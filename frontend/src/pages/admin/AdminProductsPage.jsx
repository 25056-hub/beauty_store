import { ImageUp, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCategories } from "../../api/categoriesApi";
import { createProduct, deleteProduct, getProducts, updateProduct, uploadProductImage } from "../../api/productsApi";
import AdminSidebar from "../../components/layout/AdminSidebar";

const formatCurrency = (value) => `${Number(value).toLocaleString("en-US")} MRU`;

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    category_id: "",
    description: "",
    image_url: "",
  });

  const categoryNameById = useMemo(() => (
    categories.reduce((map, category) => {
      map[category.id] = category.name;
      return map;
    }, {})
  ), [categories]);

  const visibleProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => (
      product.name.toLowerCase().includes(query)
      || categoryNameById[product.category_id]?.toLowerCase().includes(query)
    ));
  }, [categoryNameById, products, searchTerm]);

  const loadAdminProducts = async () => {
    setError("");
    setIsLoading(true);

    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts({ limit: 100 }),
        getCategories({ limit: 100 }),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminProducts();
  }, []);

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      price: "",
      stock: "",
      category_id: "",
      description: "",
      image_url: "",
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setError("");
    setFormData({
      name: product.name || "",
      price: product.price || "",
      stock: product.stock ?? "",
      category_id: product.category_id || "",
      description: product.description || "",
      image_url: product.image_url || "",
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setIsUploadingImage(true);

    try {
      const uploadedImage = await uploadProductImage(file);
      setFormData((currentData) => ({
        ...currentData,
        image_url: uploadedImage.image_url,
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const payload = {
      name: formData.name,
      description: formData.description || null,
      price: Number(formData.price),
      stock: Number(formData.stock),
      category_id: Number(formData.category_id),
      image_url: formData.image_url || null,
    };

    try {
      if (editingProduct) {
        const updatedProduct = await updateProduct(editingProduct.id, payload);
        setProducts((currentProducts) => (
          currentProducts.map((product) => (
            product.id === updatedProduct.id ? updatedProduct : product
          ))
        ));
      } else {
        const product = await createProduct(payload);
        setProducts((currentProducts) => [...currentProducts, product]);
      }

      resetForm();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    setError("");
    setDeletingId(productId);

    try {
      await deleteProduct(productId);
      setProducts((currentProducts) => (
        currentProducts.filter((product) => product.id !== productId)
      ));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-main" aria-labelledby="admin-products-title">
        <header className="admin-topbar">
          <div>
            <p>Store catalog</p>
            <h1 id="admin-products-title">Products</h1>
          </div>
          <label className="admin-search">
            <Search aria-hidden="true" size={17} />
            <input
              type="search"
              placeholder="Search product"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </header>

        <form className="admin-panel admin-product-form" aria-label="Manage product" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input
              name="name"
              type="text"
              placeholder="Rose Glow Serum"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </label>
          <label>
            <span>Price</span>
            <input
              name="price"
              type="number"
              min="1"
              step="0.01"
              placeholder="4500"
              value={formData.price}
              onChange={handleInputChange}
              required
            />
          </label>
          <label>
            <span>Stock</span>
            <input
              name="stock"
              type="number"
              min="0"
              placeholder="20"
              value={formData.stock}
              onChange={handleInputChange}
              required
            />
          </label>
          <label>
            <span>Category</span>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="admin-product-form-description">
            <span>Description</span>
            <input
              name="description"
              type="text"
              placeholder="Optional product description"
              value={formData.description}
              onChange={handleInputChange}
            />
          </label>
          <label className="admin-product-form-description">
            <span>Image URL</span>
            <input
              name="image_url"
              type="text"
              placeholder="/product-image.png or https://..."
              value={formData.image_url}
              onChange={handleInputChange}
            />
          </label>
          <label className="admin-product-upload">
            <span>Upload Image</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
            />
            <strong>
              <ImageUp aria-hidden="true" size={15} />
              {isUploadingImage ? "Uploading..." : "Choose Image"}
            </strong>
          </label>
          {formData.image_url && (
            <div className="admin-product-image-preview">
              <img src={formData.image_url} alt="Product preview" />
            </div>
          )}
          <button className="admin-primary-button" type="submit" disabled={isSubmitting || categories.length === 0}>
            {editingProduct ? <Pencil aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
            {isSubmitting
              ? "Saving..."
              : editingProduct
                ? "Save Changes"
                : "Add Product"}
          </button>
          {editingProduct && (
            <button className="admin-secondary-button" type="button" onClick={resetForm}>
              <X aria-hidden="true" size={16} />
              Cancel
            </button>
          )}
        </form>

        {error && (
          <section className="admin-panel admin-error-panel" role="alert">
            <p>{error}</p>
          </section>
        )}

        {isLoading ? (
          <section className="admin-panel admin-empty-panel" aria-live="polite">
            <p>Loading products...</p>
          </section>
        ) : (
          <article className="admin-panel admin-table-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Product List</h2>
                <p>Manage prices, stock, and visibility.</p>
              </div>
            </div>
            <table className="admin-table admin-wide-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{categoryNameById[product.category_id] || `Category ${product.category_id}`}</td>
                    <td>{product.stock}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td><span className="admin-pill admin-pill--active">Active</span></td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => handleEdit(product)}>
                          <Pencil aria-hidden="true" size={14} />
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(product.id)} disabled={deletingId === product.id}>
                          <Trash2 aria-hidden="true" size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleProducts.length === 0 && (
              <p className="orders-empty">No products found.</p>
            )}
          </article>
        )}
      </section>
    </main>
  );
}

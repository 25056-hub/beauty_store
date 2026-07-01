import { FolderPlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createCategory, deleteCategory, getCategories } from "../../shared/api/categoriesApi";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadCategories = async () => {
    setError("");
    setIsLoading(true);

    try {
      const data = await getCategories({ limit: 100 });
      setCategories(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const category = await createCategory({
        name: formData.get("name"),
        description: formData.get("description") || null,
      });
      setCategories((currentCategories) => [...currentCategories, category]);
      event.currentTarget.reset();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId) => {
    setError("");
    setDeletingId(categoryId);

    try {
      await deleteCategory(categoryId);
      setCategories((currentCategories) => (
        currentCategories.filter((category) => category.id !== categoryId)
      ));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="admin-shell">
      <AdminNavbar />
      <section className="admin-main" aria-labelledby="admin-categories-title">
        <header className="admin-topbar">
          <div>
            <p>Catalog organization</p>
            <h1 id="admin-categories-title">Categories</h1>
          </div>
        </header>

        <form className="admin-panel admin-create-form" aria-label="Create category" onSubmit={handleCreate}>
          <label>
            <span>Category Name</span>
            <input name="name" type="text" placeholder="Skincare" required />
          </label>
          <label>
            <span>Description</span>
            <input name="description" type="text" placeholder="Optional description" />
          </label>
          <button className="admin-primary-button" type="submit" disabled={isSubmitting}>
            <FolderPlus aria-hidden="true" size={16} />
            {isSubmitting ? "Adding..." : "Add Category"}
          </button>
        </form>

        {error && (
          <section className="admin-panel admin-error-panel" role="alert">
            <p>{error}</p>
          </section>
        )}

        {isLoading ? (
          <section className="admin-panel admin-empty-panel" aria-live="polite">
            <p>Loading categories...</p>
          </section>
        ) : (
          <section className="admin-category-grid">
            {categories.map((category) => (
              <article className="admin-panel admin-category-card" key={category.id}>
                <div>
                  <h2>{category.name}</h2>
                  <p>{category.description || "No description"}</p>
                </div>
                <span className="admin-pill admin-pill--active">Active</span>
                <div className="admin-row-actions">
                  <button type="button" onClick={() => handleDelete(category.id)} disabled={deletingId === category.id}>
                    <Trash2 aria-hidden="true" size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {categories.length === 0 && (
              <section className="admin-panel admin-empty-panel">
                <p>No categories found.</p>
              </section>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

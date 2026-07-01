import { Facebook, Instagram, Twitter } from "lucide-react";

const store = {
  rights: "Beauty Store. All rights reserved",
};

export default function Footer() {

  return (
    <footer id="contact" className="site-footer">
      <div className="site-container footer-simple">
        <span className="footer-logo-mark" aria-hidden="true" />
        <span className="footer-wordmark">Beauty Store</span>
        <div className="social-links" aria-label="Social links">
          <a href="#instagram" aria-label="Instagram" title="Instagram"><Instagram size={17} aria-hidden="true" /></a>
          <a href="#facebook" aria-label="Facebook" title="Facebook"><Facebook size={17} aria-hidden="true" /></a>
          <a href="#twitter" aria-label="Twitter" title="Twitter"><Twitter size={17} aria-hidden="true" /></a>
        </div>
        <small>© {new Date().getFullYear()} {store.rights}</small>
      </div>
    </footer>
  );
}

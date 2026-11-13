import { Link, useLocation } from "react-router-dom";
import { Header } from "../components/Header";

/** Shared site navigation with the store's category links kept below it. */
export function StoreHeader() {
  const { pathname, search } = useLocation();
  const category = new URLSearchParams(search).get("category") ?? "";
  const here = (path: string, value = "") =>
    (pathname === path || pathname === `${path}/`) && category === value
      ? "page"
      : undefined;
  return (
    <>
      <Header />
      <nav className="store-section-nav" aria-label="Store">
        <Link to="/store" aria-current={here("/store")}>
          All Products
        </Link>
        <Link
          to="/store?category=t-shirts"
          aria-current={here("/store", "t-shirts")}
        >
          T-Shirts
        </Link>
        <Link to="/store?category=notes" aria-current={here("/store", "notes")}>
          Notes
        </Link>
        <Link to="/store?category=books" aria-current={here("/store", "books")}>
          Books
        </Link>
        <Link
          to="/my-account/orders"
          aria-current={pathname.startsWith("/my-account") ? "page" : undefined}
        >
          My Orders
        </Link>
      </nav>
    </>
  );
}

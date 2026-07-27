import Link from "next/link";
import styles from "./Nav.module.css";

const links = [
  { href: "/", label: "Cash Flow" },
  { href: "/spending", label: "Spending" },
  { href: "/recurring", label: "Recurring" },
  { href: "/health-score", label: "Health Score" },
  { href: "/ask", label: "Ask" },
];

export default function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandName}>OB Financial Analytics</span>
        <span className={styles.brandTag}>2017&ndash;2018</span>
      </div>
      <ul className={styles.links}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={styles.link}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

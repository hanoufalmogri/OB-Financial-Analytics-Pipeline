"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

const links = [
  { href: "/", label: "Cash Flow" },
  { href: "/spending", label: "Spending" },
  { href: "/recurring", label: "Recurring" },
  { href: "/health-score", label: "Health Score" },
  { href: "/ask", label: "Ask" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandName}>OB Financial Analytics</span>
        <span className={styles.brandTag}>2017&ndash;2018</span>
      </div>
      <ul className={styles.links}>
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

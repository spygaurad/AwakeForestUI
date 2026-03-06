import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center text-sm text-gray-700 space-x-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          {item.href ? (
            <Link href={item.href} className="text-primary-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
          {i < items.length - 1 && <span className="mx-1 text-gray-400">›</span>}
        </span>
      ))}
    </nav>
  );
}

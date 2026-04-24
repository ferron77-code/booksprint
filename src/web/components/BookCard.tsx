import { Link } from "wouter";

interface Book {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  coverUrl?: string | null;
  category?: string | null;
  salesCount?: number;
  keyword?: string;
}

export function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/book/${book.id}`}>
      <div className="book-card bg-[#161616] border border-[#2a2a2a] overflow-hidden cursor-pointer group">
        {/* Cover */}
        <div className="aspect-[3/4] bg-[#1e1e1e] overflow-hidden relative">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6">
              <div className="w-12 h-1 bg-[#e85d26] mb-4" />
              <p className="font-display text-xl text-center text-white leading-tight tracking-wider">{book.title}</p>
              <div className="w-12 h-1 bg-[#e85d26] mt-4" />
            </div>
          )}
          {/* Overlay badge */}
          {book.category && (
            <div className="absolute top-3 left-3 bg-[#e85d26] text-white text-xs font-semibold px-2 py-1 uppercase tracking-wider">
              {book.category}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-bold text-[#f5f0eb] text-sm leading-tight line-clamp-2 mb-2 group-hover:text-[#e85d26] transition-colors">
            {book.title}
          </h3>
          {book.description && (
            <p className="text-[#a09890] text-xs line-clamp-2 mb-3">{book.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[#e85d26] font-bold text-lg">
              {book.price === 0 ? "Free" : `$${book.price.toFixed(2)}`}
            </span>
            {book.salesCount ? (
              <span className="text-[#a09890] text-xs">{book.salesCount} sold</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

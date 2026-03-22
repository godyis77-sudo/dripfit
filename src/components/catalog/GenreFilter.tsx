import { BRAND_GENRES, type BrandGenre } from '@/lib/brandGenres';

interface GenreFilterProps {
  selectedGenre: BrandGenre | null;
  onGenreChange: (genre: BrandGenre | null) => void;
}

const GenreFilter = ({ selectedGenre, onGenreChange }: GenreFilterProps) => (
  <div className="mb-3">
    <p className="text-[12px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">Genre</p>
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
      <button
        onClick={() => onGenreChange(null)}
        className={`shrink-0 pill ${!selectedGenre ? 'pill-active' : ''}`}
      >
        All
      </button>
      {BRAND_GENRES.map(genre => (
        <button
          key={genre}
          onClick={() => onGenreChange(genre === selectedGenre ? null : genre)}
          className={`shrink-0 pill ${selectedGenre === genre ? 'pill-active' : ''}`}
        >
          {genre}
        </button>
      ))}
    </div>
  </div>
);

export default GenreFilter;

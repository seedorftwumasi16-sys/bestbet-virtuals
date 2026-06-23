export default function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const stars = Math.min(5, Math.max(1, Math.round(rating || 3)));
  const text = size === 'md' ? 'text-sm' : 'text-xs';
  return (
    <span className={`${text} text-accent-400 tracking-tight`} aria-label={`${stars} star rating`}>
      {'⭐'.repeat(stars)}
    </span>
  );
}

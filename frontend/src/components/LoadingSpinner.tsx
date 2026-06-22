'use client';

export default function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${sizes[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-dark-600" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 border-r-accent-500 animate-spin" />
      </div>
      {text && <p className="text-gray-400 text-sm animate-pulse">{text}</p>}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';

export function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-[#d4edf8] text-[#c66b08] ${className}`} aria-hidden="true">
        <Shirt size={42} strokeWidth={1.4} />
      </div>
    );
  }

  return <img src={src} alt={alt} onError={() => setFailed(true)} className={`object-contain bg-[#d4edf8] p-2 ${className}`} />;
}

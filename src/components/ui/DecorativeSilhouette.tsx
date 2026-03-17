import { useState } from 'react';
import scanResultsFull from '@/assets/scan-results-full.jpg';

interface Props {
  className?: string;
  height?: number;
}

const DecorativeSilhouette = ({ className = '', height = 200 }: Props) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-[1rem] border-x-[18px] border-y-[15px] border-black ${className}`}
      style={{
        width: height * 0.6867,
        height,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <img
        src={scanResultsFull}
        alt="Body measurement scan results"
        className="w-full h-full object-cover"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export default DecorativeSilhouette;

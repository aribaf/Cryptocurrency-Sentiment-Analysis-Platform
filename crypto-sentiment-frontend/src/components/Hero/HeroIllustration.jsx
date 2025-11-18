export default function HeroIllustration(){
  return (
    <div className="w-full h-64 flex items-center justify-center">
      {/* inline minimal hero shapes — replace with your SVG file */}
      <svg width="340" height="160" viewBox="0 0 340 160">
        <rect x="16" y="16" rx="12" width="140" height="96" fill="#111"/>
        <rect x="176" y="26" rx="8" width="70" height="56" fill="#8b5cf6"/>
        <rect x="256" y="34" rx="6" width="40" height="36" fill="#ec4899"/>
        <rect x="308" y="44" rx="4" width="18" height="18" fill="#d9ff2f"/>
      </svg>
    </div>
  );
}

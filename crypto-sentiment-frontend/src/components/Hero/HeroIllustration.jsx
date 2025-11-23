export default function HeroIllustration() {
  return (
    // Updated container classes: 
    // - h-auto instead of fixed h-64.
    // - py-8 is added for padding on all screens, especially mobile.
    // - Added hidden on small screens and md:flex to only show it on medium screens and up, 
    //   as illustrations are often hidden on mobile to prioritize main content.
    //   (Alternatively, if you want it on all screens, remove the 'hidden md:flex' part).
    <div className="w-full **h-auto py-8** flex items-center justify-center **hidden md:flex**">
      {/* inline minimal hero shapes — replace with your SVG file */}
      {/* The SVG uses a fixed viewBox (0 0 340 160). 
        To make it responsive, we use:
        1. **w-full** and **max-w-md**: Ensures it takes up the full width but respects a max size.
        2. **h-auto**: Allows the height to scale proportionally.
      */}
      <svg 
        viewBox="0 0 340 160" 
        className="**w-full max-w-sm sm:max-w-md h-auto**"
      >
        <rect x="16" y="16" rx="12" width="140" height="96" fill="#111"/>
        <rect x="176" y="26" rx="8" width="70" height="56" fill="#8b5cf6"/>
        <rect x="256" y="34" rx="6" width="40" height="36" fill="#ec4899"/>
        <rect x="308" y="44" rx="4" width="18" height="18" fill="#d9ff2f"/>
      </svg>
    </div>
  );
}
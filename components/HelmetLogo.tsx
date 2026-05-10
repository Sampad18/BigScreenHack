export function HelmetLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Helmet outer shell */}
      <path
        d="M50 8C28 8 12 28 12 48C12 58 14 66 18 72C22 78 28 82 34 84L34 76C34 74 36 72 38 72L62 72C64 72 66 74 66 76L66 84C72 82 78 78 82 72C86 66 88 58 88 48C88 28 72 8 50 8Z"
        fill="url(#helmet-gradient)"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Visor */}
      <path
        d="M24 44C24 38 32 32 50 32C68 32 76 38 76 44L76 54C76 58 68 62 50 62C32 62 24 58 24 54L24 44Z"
        fill="url(#visor-gradient)"
        opacity="0.9"
      />
      
      {/* Visor shine */}
      <path
        d="M28 42C28 38 36 34 50 34C58 34 64 36 68 38"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      
      {/* Chin guard */}
      <path
        d="M34 76L34 88C34 92 40 96 50 96C60 96 66 92 66 88L66 76"
        fill="url(#chin-gradient)"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Center vent */}
      <rect x="46" y="16" width="8" height="12" rx="2" fill="currentColor" opacity="0.3" />
      
      {/* Side vents */}
      <rect x="30" y="20" width="6" height="8" rx="1" fill="currentColor" opacity="0.2" transform="rotate(-15 30 20)" />
      <rect x="64" y="20" width="6" height="8" rx="1" fill="currentColor" opacity="0.2" transform="rotate(15 64 20)" />
      
      <defs>
        <linearGradient id="helmet-gradient" x1="50" y1="8" x2="50" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="0.5" stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
        
        <linearGradient id="visor-gradient" x1="50" y1="32" x2="50" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E3A5F" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        
        <linearGradient id="chin-gradient" x1="50" y1="76" x2="50" y2="96" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

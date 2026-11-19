// Lambang resmi default SMPN Satu Atap Besakih dalam format SVG Data URL
// Dapat diganti kapan saja oleh pengguna melalui tombol "Ganti Logo"

const SVG_CREST = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="tealGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#115e59"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="36" fill="#ffffff"/>
  <path d="M100 14 L174 42 L174 104 C174 148 140 176 100 188 C60 176 26 148 26 104 L26 42 Z" fill="url(#tealGrad)"/>
  <path d="M100 24 L164 48 L164 103 C164 140 135 165 100 176 C65 165 36 140 36 103 L36 48 Z" fill="none" stroke="#f59e0b" stroke-width="3"/>
  <!-- Siluet Gunung Agung -->
  <path d="M46 108 L82 64 L100 84 L120 58 L154 108 Z" fill="#134e4a" opacity="0.65"/>
  <path d="M52 108 L82 70 L100 90 L120 65 L148 108 Z" fill="#0d9488"/>
  <!-- Buku Terbuka -->
  <path d="M54 114 Q77 106 100 116 Q123 106 146 114 L146 144 Q123 136 100 146 Q77 136 54 144 Z" fill="#ffffff"/>
  <line x1="100" y1="116" x2="100" y2="146" stroke="#0f766e" stroke-width="2.5"/>
  <!-- Obor / Api Ilmu -->
  <path d="M100 40 C108 52 112 60 105 68 C108 62 104 56 100 52 C96 56 93 62 96 68 C89 60 92 52 100 40 Z" fill="url(#goldGrad)"/>
  <rect x="96" y="69" width="8" height="22" rx="3" fill="url(#goldGrad)"/>
  <!-- Bintang Atas -->
  <polygon points="100,28 102.5,34 109,34 104,37.8 106,44 100,40.2 94,44 96,37.8 91,34 97.5,34" fill="#fbbf24" opacity="0.9"/>
</svg>`;

export const DEFAULT_SCHOOL_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_CREST)}`;

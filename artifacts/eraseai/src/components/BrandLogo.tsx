// The EraseAI app icon (same artwork as the Android app and favicon:
// public/brand/eraseai-icon-*.png, from ai-firewall-android/store-assets/icon-512.png).
export function BrandLogo({ className = "h-10 w-10" }: { className?: string }) {
  const src = `${import.meta.env.BASE_URL}brand/eraseai-icon-192.png`;
  return <img src={src} alt="EraseAI" className={`shrink-0 rounded-xl ${className}`} width={192} height={192} />;
}

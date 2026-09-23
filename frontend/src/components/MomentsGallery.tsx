import bannerHero from '../assets/brand/banner-hero.jpg';
import logoColor from '../assets/brand/logo-color.png';
import molduraCorner from '../assets/brand/moldura-corner.png';

interface Tile {
  className: string;
  rot: string;
  content: React.ReactNode;
}

const TILES: Tile[] = [
  {
    className: 'sm:col-span-2 sm:row-span-2',
    rot: '-rotate-1',
    content: (
      <img src={bannerHero} alt="Cartaz oficial do Kwamikon Nexus 2026" className="h-full w-full object-cover" />
    ),
  },
  {
    className: '',
    rot: 'rotate-2',
    content: (
      <div className="grain relative flex h-full w-full items-end bg-magenta p-4">
        <span className="text-sm font-extrabold uppercase tracking-wide text-cream">Cosplay</span>
      </div>
    ),
  },
  {
    className: '',
    rot: '-rotate-2',
    content: (
      <div className="h-full w-full bg-ink">
        <img src={molduraCorner} alt="Detalhe da moldura oficial #EUVOU" className="h-full w-full object-cover" />
      </div>
    ),
  },
  {
    className: '',
    rot: 'rotate-1',
    content: (
      <div className="grain relative flex h-full w-full items-end bg-gold p-4">
        <span className="text-sm font-extrabold uppercase tracking-wide text-ink">Gaming</span>
      </div>
    ),
  },
  {
    className: '',
    rot: '-rotate-1',
    content: (
      <div className="flex h-full w-full items-center justify-center bg-cream p-5">
        <img src={logoColor} alt="Kwami Kon Nexus" className="w-full" />
      </div>
    ),
  },
  {
    className: '',
    rot: 'rotate-2',
    content: (
      <div className="grain relative flex h-full w-full items-end bg-magenta-deep p-4">
        <span className="text-sm font-extrabold uppercase tracking-wide text-cream">Banda Desenhada</span>
      </div>
    ),
  },
];

export function MomentsGallery() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:[grid-auto-rows:9rem]">
      {TILES.map((tile, i) => (
        <div
          key={i}
          className={`${tile.className} ${tile.rot} aspect-square overflow-hidden border-2 border-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.4)] transition-transform duration-300 hover:z-10 hover:scale-[1.04] hover:rotate-0 sm:aspect-auto`}
        >
          {tile.content}
        </div>
      ))}
    </div>
  );
}

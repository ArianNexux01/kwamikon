import { useEffect, useState } from 'react';
import { api, type GalleryPhoto } from '../lib/api';
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

const ROTATIONS = ['rotate-2', '-rotate-2', 'rotate-1', '-rotate-1'];

/** Cartaz em destaque seguido das fotografias carregadas no backoffice. */
function photoTiles(photos: GalleryPhoto[]): Tile[] {
  return [
    TILES[0],
    ...photos.map((photo, i) => ({
      className: '',
      rot: ROTATIONS[i % ROTATIONS.length],
      content: (
        <div className="relative h-full w-full">
          <img
            src={photo.url}
            alt={photo.caption ?? 'Fotografia do Kwamikon'}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {photo.caption && (
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-3 text-xs font-extrabold uppercase tracking-wide text-cream">
              {photo.caption}
            </span>
          )}
        </div>
      ),
    })),
  ];
}

export function MomentsGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);

  useEffect(() => {
    // Sem fotografias (ou com a API em baixo) ficam as peças da identidade.
    api.gallery
      .list()
      .then(setPhotos)
      .catch(() => undefined);
  }, []);

  const tiles = photos.length > 0 ? photoTiles(photos) : TILES;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:[grid-auto-rows:9rem]">
        {tiles.map((tile, i) => (
          <div
            key={i}
            className={`${tile.className} ${tile.rot} aspect-square overflow-hidden border-2 border-ink shadow-[6px_6px_0_0_rgba(0,0,0,0.4)] transition-transform duration-300 hover:z-10 hover:scale-[1.04] hover:rotate-0 sm:aspect-auto`}
          >
            {tile.content}
          </div>
        ))}
      </div>
      {photos.length === 0 && (
        <p className="mt-6 text-xs text-cream/40">
          Peças oficiais da identidade do Kwamikon Nexus. Fotografias das edições anteriores são adicionadas assim que a
          organização as disponibilizar.
        </p>
      )}
    </>
  );
}

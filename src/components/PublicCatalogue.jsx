import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Package, Search } from 'lucide-react';
import QRCode from 'qrcode';
import { API_BASE } from '../config';
import { ProductImage } from './ProductImage';

const STORE_NAME = 'Star Apparels';
const STORE_TAGLINE = 'Makes you shine';
const STORE_PHONE = '9945715152';
const STORE_PHONE_ALT = '8600143152';
const STORE_ADDRESS = 'Shop No. 5, Metro Greens, Tilekar Nagar, Kondhwa BK, Pune - 411048';
const STORE_BRANCH = 'Palm Garments, Cinema Road, Baramati';

export function PublicCatalogue() {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All categories');
  const [size, setSize] = useState('All sizes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogueQrCode, setCatalogueQrCode] = useState('');

  useEffect(() => {
    const loadCatalogue = async () => {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch(`${API_BASE}/products`),
          fetch(`${API_BASE}/categories`),
        ]);

        if (!productsResponse.ok) {
          throw new Error('Unable to load the catalogue');
        }

        const products = await productsResponse.json();
        const categoryList = categoriesResponse.ok ? await categoriesResponse.json() : [];
        setInventory(products);
        setCategories(categoryList);
      } catch (err) {
        setError(err.message || 'Unable to load the catalogue');
      } finally {
        setLoading(false);
      }
    };

    loadCatalogue();
  }, []);

  useEffect(() => {
    const catalogueUrl = `${window.location.origin}/star-kidswear/catalogue`;
    QRCode.toDataURL(catalogueUrl, {
      width: 180,
      margin: 2,
      color: { dark: '#172f68', light: '#ffffff' },
    })
      .then(setCatalogueQrCode)
      .catch(() => setCatalogueQrCode(''));
  }, []);

  const sizes = useMemo(
    () => [...new Set(inventory.map((item) => String(item.size || '')).filter(Boolean))].sort(),
    [inventory]
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return inventory.filter((item) => {
      const searchable = `${item.name || ''} ${item.brand || ''} ${item.color || ''} ${item.category || ''}`.toLowerCase();
      const matchesSearch = !term || searchable.includes(term);
      const matchesCategory = category === 'All categories' || item.category === category;
      const matchesSize = size === 'All sizes' || String(item.size) === size;
      return matchesSearch && matchesCategory && matchesSize;
    });
  }, [category, inventory, searchTerm, size]);

  return (
    <main className="min-h-screen bg-[#e3f4fb] text-[#172f68]">
      <header className="border-b border-[#b7d9ea] bg-[#d4edf8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/assets/branding/star-logo.jpg"
              alt={`${STORE_NAME} logo`}
              className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-[0.12em] text-[#203e82] sm:text-4xl">{STORE_NAME}</h1>
              <p className="mt-1 text-lg font-semibold uppercase tracking-[0.16em] text-[#c66b08] sm:text-xl">{STORE_TAGLINE}</p>
              <p className="mt-2 max-w-3xl text-sm text-[#203e82]">Explore lowers, leggings, night suits, T-shirts, coord sets, jeans, tracks, socks, sweatshirts, hoodies, inners, slips, 3/4ths, and rainwear.</p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-lg border border-[#403092] px-3 py-2 text-sm font-semibold text-[#403092] transition hover:bg-[#403092] hover:text-white"
          >
            Staff sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mt-8" aria-label="Catalogue filters">
          <div className="grid gap-3 rounded-2xl border border-[#b7d9ea] bg-white p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative block">
              <span className="sr-only">Search catalogue</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7896]" size={18} />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search styles, colours, or brands"
                className="w-full rounded-lg border border-[#b7c9d7] py-3 pl-10 pr-3 outline-none transition focus:border-[#403092] focus:ring-2 focus:ring-[#d9d2f5]"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-[#b7c9d7] px-3 py-3 outline-none focus:border-[#403092] focus:ring-2 focus:ring-[#d9d2f5]">
                <option>All categories</option>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by size</span>
              <select value={size} onChange={(event) => setSize(event.target.value)} className="w-full rounded-lg border border-[#b7c9d7] px-3 py-3 outline-none focus:border-[#403092] focus:ring-2 focus:ring-[#d9d2f5]">
                <option>All sizes</option>
                {sizes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Available styles</h2>
            <p className="mt-1 text-sm text-[#526789]">{filteredItems.length} {filteredItems.length === 1 ? 'style' : 'styles'} found</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-[#526789]">Loading the latest styles...</div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#9fc5d8] bg-white px-6 py-16 text-center">
            <Package className="mx-auto text-[#6c7896]" size={32} />
            <h3 className="mt-3 font-semibold">No styles match those filters</h3>
            <p className="mt-1 text-sm text-[#526789]">Try a different search or choose another category.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const inStock = Number(item.stock) > 0;
              return (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-[#b7d9ea] bg-white shadow-sm">
                  <ProductImage
                    src={item.imageUrl}
                    alt={`${item.name} ${item.color || ''} size ${item.size}`}
                    className="h-36 w-full"
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 text-xs text-[#526789]">
                      <span>{item.category || 'Kidswear'}</span>
                      <span className={inStock ? 'text-emerald-700' : 'text-red-600'}>{inStock ? 'In stock' : 'Sold out'}</span>
                    </div>
                    <h3 className="mt-3 font-semibold text-[#172f68]">{item.name}</h3>
                    <p className="mt-1 text-sm text-[#526789]">{item.color || 'Classic colour'} · Size {item.size}</p>
                    <p className="mt-4 text-xl font-bold text-[#203e82]">₹{item.price}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section className="mt-14 border-t border-[#9fc5d8] pt-10" aria-labelledby="visit-us-heading">
          <div className="rounded-2xl border border-[#b7d9ea] bg-[#d4edf8] p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c66b08]">Visit us</p>
            <h2 id="visit-us-heading" className="mt-2 text-2xl font-bold text-[#203e82] sm:text-3xl">Come say hello at {STORE_NAME}.</h2>
            <p className="mt-3 max-w-xl text-[#203e82]">{STORE_TAGLINE}. Find our latest kidswear collection at our Pune store or Baramati branch.</p>
            <div className="mt-5 space-y-2 text-sm text-[#172f68]">
              <p><strong>Shop:</strong> {STORE_ADDRESS}</p>
              <p><strong>Branch:</strong> {STORE_BRANCH}</p>
              <p><strong>Call:</strong> <a className="font-semibold underline decoration-[#c66b08] underline-offset-2" href={`tel:${STORE_PHONE}`}>{STORE_PHONE}</a> / <a className="font-semibold underline decoration-[#c66b08] underline-offset-2" href={`tel:${STORE_PHONE_ALT}`}>{STORE_PHONE_ALT}</a></p>
              <p><strong>Instagram:</strong> <span className="font-semibold">@starapparels</span></p>
            </div>
            {catalogueQrCode && (
              <div className="mt-6 flex items-center gap-4 border-t border-[#b7c9d7] pt-5">
                <img src={catalogueQrCode} alt="QR code to open the Star Apparels catalogue" className="h-28 w-28 rounded-lg bg-white p-2" />
                <p className="max-w-xs text-sm font-semibold text-[#203e82]">Scan to open our catalogue on your phone.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

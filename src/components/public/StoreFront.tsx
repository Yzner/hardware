import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search, ShoppingCart, MapPin, Phone, Mail, Clock, Package,
  Tag, TrendingDown, X, Send, Loader2, Hammer,
  CheckCircle, AlertCircle, Menu
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  unit: string;
  image_url?: string;
  description?: string;
  is_promo?: boolean;
  promo_price?: number;
  is_public?: boolean;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function productImage(name: string): string {
  const categories: { keywords: string[]; url: string }[] = [
    { keywords: ['amakan roll'], url: 'https://i.postimg.cc/N0tcwgSq/660461418-978671784673026-6793742864443919472-n.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['barb'], url: 'https://i.postimg.cc/P5HjgWPK/1000399636.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['brush'], url: 'https://i.postimg.cc/qvrTPsz1/1000399668.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['plywood', 'shira'], url: 'https://i.postimg.cc/yNYzd7ht/1000399676.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['sawale'], url: 'https://i.postimg.cc/1t8hGMjV/1000399680.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['pvc'], url: 'https://i.postimg.cc/Dzj34RBw/1000399681.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['black host'], url: 'https://i.postimg.cc/qRNVsQ5r/1000399678.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['diamond'], url: 'https://i.postimg.cc/258f6CdW/1000399669.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['nail'], url: 'https://i.postimg.cc/HLsCxT09/1000399673.jpg?auto=compress&cs=tinysrgb&w=600' },
    { keywords: ['tirewire'], url: 'https://i.postimg.cc/6Q5N3BVv/1000399674.jpg?auto=compress&cs=tinysrgb&w=600' },
  ];
  const lower = name.toLowerCase();
  for (const cat of categories) {
    if (cat.keywords.some((k) => lower.includes(k))) return cat.url;
  }
  return 'https://i.postimg.cc/BvbCbFd4/Untitled-design-(7).png?auto=compress&cs=tinysrgb&w=1000';
}

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [contactSent, setContactSent] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [sendingContact, setSendingContact] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('id, name, price, stock, unit, image_url, description, is_promo, promo_price, is_public')
        .order('name');
      if (err) throw err;
      setProducts((data || []).filter((p: Product) => p.is_public !== false));
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const promoProducts = products.filter((p) => p.is_promo && p.promo_price);
  const inStock = products.filter((p) => p.stock > 0);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSendingContact(true);
    setTimeout(() => {
      setSendingContact(false);
      setContactSent(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactSent(false), 5000);
    }, 1000);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white">
                <img
                  src="https://i.postimg.cc/SNkhx31h/Untitled-design-(5).png"
                  alt="LUVICON Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">LUVICON Hardware</h1>
                <p className="text-xs text-slate-500 leading-tight">Construction Supply &amp; Metal Works</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <button onClick={() => scrollToSection('home')} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-green-600 transition-colors">Home</button>
              <button onClick={() => scrollToSection('products')} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-green-600 transition-colors">Products</button>
              <button onClick={() => scrollToSection('promos')} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-green-600 transition-colors">Promotions</button>
              <button onClick={() => scrollToSection('contact')} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-green-600 transition-colors">Contact</button>
            </nav>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-600">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 flex flex-col gap-1">
              <button onClick={() => scrollToSection('home')} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-green-600 text-left">Home</button>
              <button onClick={() => scrollToSection('products')} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-green-600 text-left">Products</button>
              <button onClick={() => scrollToSection('promos')} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-green-600 text-left">Promotions</button>
              <button onClick={() => scrollToSection('contact')} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-green-600 text-left">Contact</button>
            </nav>
          )}
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(https://i.postimg.cc/XJRzmGmS/750554152-4563164397339303-80841020702445777-n.jpg?auto=compress&cs=tinysrgb&w=1200)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full mb-6">
            <Hammer className="w-4 h-4 text-green-400" />
            <span className="text-green-300 text-sm font-medium">Your Trusted Hardware Partner</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
            Quality Tools &amp; Materials<br />for Every Project
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            Browse our full catalog of hardware, tools, and building supplies. Competitive prices, reliable stock, expert service.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => scrollToSection('products')} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-green-500/20">
              <Package className="w-5 h-5" />
              Browse Products
            </button>
            <button onClick={() => scrollToSection('contact')} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors border border-white/20">
              <Phone className="w-5 h-5" />
              Contact Us
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-slate-400 text-sm">
            <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-green-400" /> {products.length} Products</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> {inStock.length} In Stock</span>
            <span className="flex items-center gap-1.5"><TrendingDown className="w-4 h-4 text-rose-400" /> {promoProducts.length} On Promo</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Promotions */}
      {promoProducts.length > 0 && (
        <section id="promos" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Tag className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Special Promotions</h2>
                <p className="text-slate-500 text-sm">Limited time deals — grab them while they last</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {promoProducts.map((p) => (
                <div key={p.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img src={p.image_url || productImage(p.name)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md">SALE</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 mb-1 truncate">{p.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-rose-600">${fmt(Number(p.promo_price))}</span>
                      <span className="text-sm text-slate-400 line-through">${fmt(Number(p.price))}</span>
                      <span className="text-xs text-slate-500">/{p.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products */}
      <section id="products" className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Our Products</h2>
                <p className="text-slate-500 text-sm">{filtered.length} items available</p>
              </div>
            </div>
            <div className="relative sm:max-w-xs w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Search products..."
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">{products.length === 0 ? 'No products available yet.' : 'No products match your search.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((p) => {
                const isPromo = p.is_promo && p.promo_price;
                const displayPrice = isPromo ? Number(p.promo_price) : Number(p.price);
                const outOfStock = p.stock <= 0;
                return (
                  <div key={p.id} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
                    <div className="relative h-48 overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                      <img src={p.image_url || productImage(p.name)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {isPromo && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md">PROMO</span>
                      )}
                      {outOfStock ? (
                        <span className="absolute top-3 right-3 px-2.5 py-1 bg-slate-600 text-white text-xs font-bold rounded-lg shadow-md">Out of Stock</span>
                      ) : p.stock <= 10 ? (
                        <span className="absolute top-3 right-3 px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded-lg shadow-md">Low Stock</span>
                      ) : (
                        <span className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md">In Stock</span>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1 truncate cursor-pointer hover:text-green-600" onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                      {p.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{p.description}</p>}
                      <div className="flex items-baseline gap-2 mt-auto">
                        {isPromo && <span className="text-sm text-slate-400 line-through">${fmt(Number(p.price))}</span>}
                        <span className={`text-xl font-bold ${isPromo ? 'text-rose-600' : 'text-slate-900'}`}>${fmt(displayPrice)}</span>
                        <span className="text-xs text-slate-500">/{p.unit}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">{p.stock > 0 ? `${p.stock} ${p.unit} available` : 'Currently unavailable'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Get in Touch</h2>
              <p className="text-slate-500 text-sm">Have questions? We're here to help.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Visit Us</p>
                  <p className="text-slate-500 text-sm">National Highway, Purok Magsasaka, Santa Lourdes, PPC, Palawan</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <Phone className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Call & Message Us</p>
                  <p className="text-slate-500 text-sm">0910-495-2354</p>
                  <p className="text-slate-500 text-sm">0994-845-6351</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <Mail className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Email Us</p>
                  <p className="text-slate-500 text-sm">llorenz.10022002@gmail.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                <Clock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Business Hours</p>
                  <p className="text-slate-500 text-sm">Mon-Sun: 7:30 AM - 5:30 PM</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  required
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="How can we help you?"
                />
              </div>
              {contactSent && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Thank you! We'll get back to you soon.
                </div>
              )}
              <button
                type="submit"
                disabled={sendingContact}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
              >
                {sendingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingContact ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
    <footer className="bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
            <img
              src="https://i.postimg.cc/SNkhx31h/Untitled-design-(5).png"
              alt="LUVICON Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <span className="text-white font-bold">
            LUVICON Hardware Construction Supply
          </span>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          Quality tools and materials for every build.
        </p>

        <p className="text-slate-600 text-xs mt-4">
          &copy; 2026 LUVICON Hardware Construction Supply. All rights reserved.
        </p>
      </div>
    </footer>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-64 bg-slate-100">
              <img src={selectedProduct.image_url || productImage(selectedProduct.name)} alt={selectedProduct.name} className="w-full h-full object-cover" />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors">
                <X className="w-5 h-5 text-slate-700" />
              </button>
              {selectedProduct.is_promo && selectedProduct.promo_price && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-rose-500 text-white text-sm font-bold rounded-lg shadow-md">PROMO</span>
              )}
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedProduct.name}</h2>
              {selectedProduct.description && <p className="text-slate-600 mb-4">{selectedProduct.description}</p>}
              <div className="flex items-baseline gap-3 mb-4">
                {selectedProduct.is_promo && selectedProduct.promo_price && (
                  <span className="text-lg text-slate-400 line-through">${fmt(Number(selectedProduct.price))}</span>
                )}
                <span className={`text-3xl font-bold ${selectedProduct.is_promo && selectedProduct.promo_price ? 'text-rose-600' : 'text-slate-900'}`}>
                  ${fmt(selectedProduct.is_promo && selectedProduct.promo_price ? Number(selectedProduct.promo_price) : Number(selectedProduct.price))}
                </span>
                <span className="text-slate-500">/{selectedProduct.unit}</span>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {selectedProduct.stock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> In Stock — {selectedProduct.stock} {selectedProduct.unit} available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                    <AlertCircle className="w-4 h-4" /> Out of Stock
                  </span>
                )}
              </div>
              <button onClick={() => scrollToSection('contact')} className="w-full inline-flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-colors">
                <ShoppingCart className="w-4 h-4" />
                Inquire About This Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

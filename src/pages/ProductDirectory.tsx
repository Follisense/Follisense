import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { isNonCompliant } from '@/lib/compliance';

interface ProductEntry {
  name: string;
  desc: string;
  tag: 'Scalp' | 'Hair' | 'Both';
}

interface ProductCategory {
  name: string;
  products: ProductEntry[];
}

// ---------------------------------------------------------------
// NOTE (compliance): Per the FolliSense SaMD Compliance Harness,
// this directory lists COSMETIC products only. No medicines
// (minoxidil, ketoconazole, coal tar, selenium sulfide, etc.),
// no disease names, no treatment claims. Descriptions use cosmetic
// framing ("helps with the look and feel of...") not medical claims
// ("treats..."). The isNonCompliant() filter below is a safety net:
// if a banned entry is ever added, it won't render.
// ---------------------------------------------------------------

const productDirectory: ProductCategory[] = [
  {
    name: 'Scalp oils',
    products: [
      { name: 'Tea tree oil', desc: 'A refreshing oil often used to help with flaking and buildup on the scalp', tag: 'Scalp' },
      { name: 'Rosemary oil (e.g., Mielle Rosemary Mint)', desc: 'Popular scalp oil with an invigorating feel that many use as part of a growth-support routine', tag: 'Scalp' },
      { name: 'Castor oil (e.g., Jamaican Mango & Lime JBCO)', desc: 'Thick, moisturising oil often used to nourish edges and coat the strands', tag: 'Scalp' },
      { name: 'Peppermint oil', desc: 'Cooling oil that gives a fresh, tingly feel and helps soothe an itchy-feeling scalp', tag: 'Scalp' },
      { name: 'Jojoba oil (scalp use)', desc: 'Mimics the scalp\'s natural sebum and helps balance how oily or dry it feels', tag: 'Both' },
      { name: 'Neem oil', desc: 'Traditional scalp oil often used to comfort flaky, irritated-feeling areas', tag: 'Scalp' },
      { name: 'Coconut oil (scalp use)', desc: 'Rich, moisturising oil that softens the hair and scalp', tag: 'Both' },
    ],
  },
  {
    name: 'Scalp care',
    products: [
      { name: 'Multi-peptide serum (e.g., The Ordinary)', desc: 'Peptide-based scalp serum used to support the look of fuller, denser-looking hair', tag: 'Scalp' },
      { name: 'Clarifying shampoo (e.g., SheaMoisture, Neutrogena Anti-Residue)', desc: 'Deep-cleansing shampoo that removes product buildup and leaves the scalp feeling fresh', tag: 'Scalp' },
      { name: 'Tea tree shampoo', desc: 'Gentle, refreshing cleanse for a scalp that feels itchy or congested', tag: 'Scalp' },
      { name: 'Scalp scrub / exfoliator', desc: 'Physical exfoliant that lifts buildup and flaking for a cleaner-feeling scalp', tag: 'Scalp' },
      { name: 'Rosemary & mint scalp rinse', desc: 'Invigorating rinse that leaves the scalp feeling clean and refreshed', tag: 'Scalp' },
    ],
  },
  {
    name: 'Hair oils and butters',
    products: [
      { name: 'Argan oil (e.g., Moroccanoil)', desc: 'Lightweight oil that adds shine and reduces the look of frizz', tag: 'Hair' },
      { name: 'Jojoba oil', desc: 'Light oil that moisturises without heaviness', tag: 'Hair' },
      { name: 'Hair oil blend (e.g., Mielle, The Ordinary)', desc: 'Multi-oil blend for moisture and shine', tag: 'Hair' },
      { name: 'Shea butter', desc: 'Rich moisturiser for dry, coily hair', tag: 'Hair' },
      { name: 'Mango butter', desc: 'Softening butter that helps hair hold on to moisture', tag: 'Hair' },
      { name: 'Avocado oil', desc: 'Penetrating oil rich in vitamins for dry-feeling hair', tag: 'Hair' },
      { name: 'Grapeseed oil', desc: 'Light sealant that adds shine without weight', tag: 'Hair' },
      { name: 'Marula oil', desc: 'Fast-absorbing oil that softens and adds shine', tag: 'Hair' },
    ],
  },
  {
    name: 'Styling products',
    products: [
      { name: 'Edge control (e.g., Ebin, Got2b, Gorilla Snot)', desc: 'Holds edges in place with a smooth finish', tag: 'Hair' },
      { name: 'Styling gel (e.g., Eco Styler, Uncle Funky\'s Daughter)', desc: 'Flexible hold for wash-and-gos, twist-outs, and sets', tag: 'Hair' },
      { name: 'Curl cream (e.g., Eco Style, Twist by Ouidad, Cantu)', desc: 'Defines curls while adding moisture', tag: 'Hair' },
      { name: 'Mousse', desc: 'Lightweight hold and volume for curls and coils', tag: 'Hair' },
      { name: 'Twist butter', desc: 'Holds twists and adds moisture during protective styling', tag: 'Hair' },
      { name: 'Loc gel or butter', desc: 'Maintains and moisturises locs', tag: 'Hair' },
      { name: 'Heat protectant (e.g., Chi 44 Iron Guard, TRESemme, GHD)', desc: 'Shields hair from heat during styling', tag: 'Hair' },
    ],
  },
  {
    name: 'Treatments and conditioners',
    products: [
      { name: 'Deep conditioner, moisture (e.g., SheaMoisture Manuka Honey, Amika Soulfood)', desc: 'Intense hydration for dry, brittle-feeling hair', tag: 'Hair' },
      { name: 'Deep conditioner, protein (e.g., Aphogee, SheaMoisture Manuka Honey & Yogurt)', desc: 'Strengthens the feel of the hair and helps reduce breakage', tag: 'Hair' },
      { name: 'Leave-in conditioner (e.g., SheaMoisture, Cantu, Aunt Jackie\'s)', desc: 'Daily moisture and detangling for hair', tag: 'Hair' },
      { name: 'Protein treatment (e.g., Aphogee Two-Step, Curlsmith)', desc: 'Reinforces hair with protein to improve strength and reduce breakage', tag: 'Hair' },
      { name: 'Bond repair treatment (e.g., Olaplex No.3, K18)', desc: 'Helps restore the feel of hair stressed by chemicals or heat', tag: 'Hair' },
      { name: 'Hot oil treatment', desc: 'Warm oil applied to hair and scalp for deep conditioning', tag: 'Both' },
      { name: 'Rice water rinse', desc: 'Protein-rich rinse that strengthens the feel of hair and adds shine', tag: 'Hair' },
      { name: 'Apple cider vinegar rinse', desc: 'Clarifies buildup and leaves hair and scalp feeling balanced', tag: 'Both' },
    ],
  },
];

const ProductDirectory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const typeFilter = searchParams.get('type'); // 'scalp' | 'hair' | null
  const { onboardingData, setOnboardingData } = useApp();

  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<string[]>([productDirectory[0].name]);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

  const userScalpProducts = onboardingData.scalpProducts || [];
  const userHairProducts = onboardingData.hairProducts || [];

  const toggleCategory = (name: string) => {
    setExpandedCats(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const addProduct = (product: ProductEntry) => {
    setAddedProducts(prev => new Set(prev).add(product.name));

    if (product.tag === 'Scalp' || product.tag === 'Both') {
      if (!userScalpProducts.includes(product.name)) {
        setOnboardingData({ ...onboardingData, scalpProducts: [...userScalpProducts, product.name] });
      }
    }
    if (product.tag === 'Hair' || product.tag === 'Both') {
      if (!userHairProducts.includes(product.name)) {
        setOnboardingData({ ...onboardingData, hairProducts: [...userHairProducts, product.name] });
      }
    }
  };

  const isAdded = (name: string) => {
    return addedProducts.has(name) || userScalpProducts.includes(name) || userHairProducts.includes(name);
  };

  const filteredDirectory = productDirectory
    .map(cat => ({
      ...cat,
      products: cat.products.filter(p => {
        // ── Compliance safety net: never render a banned/medicine entry ──
        if (isNonCompliant({ name: p.name, description: p.desc })) return false;

        const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase());
        const matchesType = !typeFilter || (typeFilter === 'scalp' && (p.tag === 'Scalp' || p.tag === 'Both')) || (typeFilter === 'hair' && (p.tag === 'Hair' || p.tag === 'Both'));
        return matchesSearch && matchesType;
      }),
    }))
    .filter(cat => cat.products.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[430px] mx-auto px-6">
        <div className="flex items-center gap-3 py-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={22} className="text-foreground" strokeWidth={1.8} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Product Guide</h1>
            <p className="text-xs text-muted-foreground">Browse common scalp and hair products</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by product name, type, or ingredient"
            className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="space-y-3 pb-24">
          {filteredDirectory.map(cat => (
            <div key={cat.name} className="card-elevated overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.name)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-semibold text-foreground text-sm">{cat.name}</p>
                  <p className="text-xs text-muted-foreground">{cat.products.length} products</p>
                </div>
                {expandedCats.includes(cat.name) ? (
                  <ChevronUp size={18} className="text-muted-foreground" strokeWidth={1.8} />
                ) : (
                  <ChevronDown size={18} className="text-muted-foreground" strokeWidth={1.8} />
                )}
              </button>

              {expandedCats.includes(cat.name) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-border"
                >
                  {cat.products.map(product => {
                    const added = isAdded(product.name);
                    return (
                      <div key={product.name} className="flex items-start gap-3 p-4 border-b border-border last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{product.desc}</p>
                          <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            product.tag === 'Scalp' ? 'bg-sage-light text-primary' :
                            product.tag === 'Hair' ? 'bg-secondary text-foreground' :
                            'bg-accent text-foreground'
                          }`}>{product.tag}</span>
                        </div>
                        <button
                          onClick={() => !added && addProduct(product)}
                          disabled={added}
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                            added ? 'bg-primary/10' : 'bg-accent btn-press'
                          }`}
                        >
                          {added ? (
                            <Check size={16} className="text-primary" strokeWidth={2} />
                          ) : (
                            <Plus size={16} className="text-foreground" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          ))}

          {filteredDirectory.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No products found matching "{search}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDirectory;

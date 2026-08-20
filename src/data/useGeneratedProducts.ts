import { useState, useEffect, useCallback } from 'react';
import { OnboardingData } from '@/contexts/AppContext';

export interface GeneratedProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  concern: string[];
  benefit: string;
  description: string;
  priceKsh: number;
  rating: number;
  badge: string;
  badgeColor: string;
  image: string;
  jumiaUrl: string;
  amazonUrl: string;
}

// Real product images from iHerb CDN (stable public URLs)
const PRODUCT_CATALOG: Omit<GeneratedProduct, 'id'>[] = [
  {
    name: 'Jamaican Black Castor Oil Strengthen & Restore Shampoo',
    brand: 'SheaMoisture',
    category: 'Shampoo',
    concern: ['Growth', 'Thinning', 'Dryness'],
    benefit: 'Strengthens and restores damaged hair',
    description: 'Enriched with Jamaican Black Castor Oil and Shea Butter, this shampoo cleanses while nourishing dry, damaged hair and promoting healthy growth.',
    priceKsh: 1800,
    rating: 4.6,
    badge: 'Best Seller',
    badgeColor: '#D4A866',
        image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/shea%20moisture%20jamaican%20black%20castor%20oil.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=sheamoisture+castor+oil+shampoo',
    amazonUrl: 'https://www.amazon.com/s?k=sheamoisture+jamaican+black+castor+oil+shampoo',
  },
  {
    name: 'Shea Butter Leave-In Conditioning Repair Cream',
    brand: 'Cantu',
    category: 'Leave-in',
    concern: ['Dryness', 'Breakage', 'Styling'],
    benefit: 'Deep moisture and frizz control',
    description: 'A rich leave-in cream with pure shea butter that moisturises, detangles and reduces breakage while defining natural curl patterns.',
    priceKsh: 950,
    rating: 4.7,
    badge: 'Top Rated',
    badgeColor: '#4CAF50',
    image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/cantu%20leave%20in%20conditioning%20cream%202.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=cantu+leave+in+conditioning+cream',
    amazonUrl: 'https://www.amazon.com/s?k=cantu+shea+butter+leave-in+conditioning+repair+cream',
  },
  {
    name: 'Jamaican Black Castor Oil',
    brand: 'Sunny Isle',
    category: 'Scalp Oil',
    concern: ['Growth', 'Thinning', 'Itching'],
    benefit: 'Stimulates growth and soothes scalp',
    description: 'Pure Jamaican Black Castor Oil to stimulate hair follicles, thicken hair strands and relieve an itchy, dry scalp.',
    priceKsh: 1200,
    rating: 4.8,
    badge: 'Staff Pick',
    badgeColor: '#9C27B0',
    image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/sunny%20isle%20jamaican%20black%20castor%20oil.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=jamaican+black+castor+oil',
    amazonUrl: 'https://www.amazon.com/s?k=sunny+isle+jamaican+black+castor+oil',
  },
  {
    name: 'Anti-Dandruff Shampoo',
    brand: 'Nizoral',
    category: 'Scalp Treatment',
    concern: ['Itching', 'Flaking', 'Buildup'],
    benefit: 'Clinically proven dandruff control',
    description: 'Ketoconazole 1% formula that treats dandruff, seborrheic dermatitis and relieves persistent scalp itch and flaking.',
    priceKsh: 1450,
    rating: 4.5,
    badge: 'Clinical',
    badgeColor: '#2196F3',
    image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/nizoral+anti+dandruff+shampoo.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=nizoral+shampoo',
    amazonUrl: 'https://www.amazon.com/s?k=nizoral+anti+dandruff+shampoo',
  },
  {
    name: 'Biotin & Collagen Shampoo',
    brand: 'OGX',
    category: 'Shampoo',
    concern: ['Thinning', 'Growth', 'Breakage'],
    benefit: 'Thickens and volumises fine hair',
    description: 'Infused with biotin and collagen to plump each strand, strengthen hair and promote a fuller, thicker appearance.',
    priceKsh: 1100,
    rating: 4.4,
    badge: 'Popular',
    badgeColor: '#FF5722',
       image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/ogx%20biotin%20collagen%20shampoo.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=ogx+biotin+collagen+shampoo',
    amazonUrl: 'https://www.amazon.com/s?k=ogx+biotin+collagen+shampoo',
  },
  {
    name: 'Rosemary Mint Scalp & Hair Strengthening Oil',
    brand: 'Mielle Organics',
    category: 'Scalp Oil',
    concern: ['Growth', 'Itching', 'Thinning'],
    benefit: 'Stimulates scalp circulation',
    description: 'Rosemary and mint oil blend that stimulates scalp circulation, strengthens follicles and reduces shedding for noticeably thicker hair.',
    priceKsh: 1650,
    rating: 4.7,
    badge: 'Trending',
    badgeColor: '#00BCD4',
       image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/mielle%20rosemary%20mint%20scalp%20&%20hair%20strengthening%20oil.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=mielle+rosemary+mint+scalp+oil',
    amazonUrl: 'https://www.amazon.com/s?k=mielle+organics+rosemary+mint+scalp+hair+oil',
  },
  {
    name: 'Wild Growth Hair Oil',
    brand: 'Wild Growth',
    category: 'Hair Growth',
    concern: ['Growth', 'Thinning', 'Breakage'],
    benefit: 'Accelerates length retention',
    description: 'A blend of olive oil, jojoba and coconut oil fortified with vitamins D, E and choline that conditions the scalp and promotes faster, stronger growth.',
    priceKsh: 900,
    rating: 4.3,
    badge: 'Value',
    badgeColor: '#8BC34A',
   image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/wild%20growth%20hair%20oil.webp',
   jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=wild+growth+hair+oil',
    
   amazonUrl: 'https://www.amazon.com/s?k=wild+growth+hair+oil',
  },
  {
    name: 'Curl Maker Curling Jelly',
    brand: 'Camille Rose',
    category: 'Styling',
    concern: ['Styling', 'Dryness', 'Breakage'],
    benefit: 'Long-lasting curl definition without crunch',
    description: 'A lightweight curl-defining gel enriched with honey and aloe vera that delivers moisture-rich, frizz-free curls all day.',
    priceKsh: 2200,
    rating: 4.6,
    badge: 'New',
    badgeColor: '#E91E63',
        image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/camille%20rose%20curl%20maker.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=camille+rose+curl+maker',
    amazonUrl: 'https://www.amazon.com/s?k=camille+rose+curl+maker',
  },
  {
    name: 'Apple Cider Vinegar Root Relief Scalp Spray',
    brand: 'Cantu',
    category: 'Scalp Treatment',
    concern: ['Buildup', 'Itching', 'Flaking'],
    benefit: 'Balances scalp pH and removes buildup',
    description: 'Apple cider vinegar scalp spray that removes product buildup, rebalances scalp pH and soothes irritation without stripping moisture.',
    priceKsh: 1050,
    rating: 4.3,
    badge: 'New',
    badgeColor: '#F44336',
        image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/cantu%20apple%20cider%20vinegar%20root%20relief.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=cantu+apple+cider+vinegar+root+relief',
    amazonUrl: 'https://www.amazon.com/s?k=cantu+apple+cider+vinegar+root+relief',
  },
  {
    name: 'Biotin 5000mcg Softgels',
    brand: 'Sports Research',
    category: 'Supplement',
    concern: ['Growth', 'Thinning', 'Breakage'],
    benefit: 'Supports hair growth from within',
    description: 'High-potency 5,000mcg biotin softgels with organic coconut oil for enhanced absorption. Supports hair, skin and nail health from the inside out.',
    priceKsh: 2800,
    rating: 4.5,
    badge: 'Premium',
    badgeColor: '#673AB7',
        image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/natures%20aid%20hair%20supplements.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=biotin+hair+growth+supplement',
    amazonUrl: 'https://www.amazon.com/s?k=sports+research+biotin+5000mcg',
  },
  {
    name: 'Coconut Oil Formula Leave-In Conditioner',
    brand: "Palmer's",
    category: 'Leave-in',
    concern: ['Dryness', 'Breakage', 'Styling'],
    benefit: 'Intense moisture for dry, brittle hair',
    description: 'Coconut oil-infused leave-in conditioner that deeply moisturises, detangles and protects hair from heat and environmental damage.',
    priceKsh: 650,
    rating: 4.4,
    badge: 'Value',
    badgeColor: '#795548',
       image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/coconut%20&%20hibiscus%20curl%20enhancing%20smoothie.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=palmers+coconut+oil+leave+in+conditioner',
    amazonUrl: 'https://www.amazon.com/s?k=palmers+coconut+oil+formula+leave-in+conditioner',
  },
  {
    name: 'Natural Honey & Shea Edge Tamer',
    brand: 'Design Essentials',
    category: 'Edge Control',
    concern: ['Styling', 'Dryness'],
    benefit: 'Smooth edges without flaking or residue',
    description: 'Honey and shea butter edge control that lays edges flat without white residue, crunchiness or dryness — even on thick, coily hair.',
    priceKsh: 1300,
    rating: 4.6,
    badge: 'Best Seller',
    badgeColor: '#D4A866',
        image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/honey&%20edge%20tamer.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=design+essentials+edge+tamer',
    amazonUrl: 'https://www.amazon.com/s?k=design+essentials+natural+honey+shea+edge+tamer',
  },
  {
    name: 'Manuka Honey & Mafura Oil Intensive Hydration Conditioner',
    brand: 'SheaMoisture',
    category: 'Conditioner',
    concern: ['Dryness', 'Breakage', 'Itching'],
    benefit: 'Intense hydration for very dry hair',
    description: 'A deeply hydrating conditioner with Manuka honey and Mafura oil that restores moisture balance, reduces breakage and leaves hair silky smooth.',
    priceKsh: 1900,
    rating: 4.7,
    badge: 'Top Rated',
    badgeColor: '#4CAF50',
        image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/shea%20moisture%20manuka%20honey%20&%20mafura%20oil%20intensive%20hydration%20conditioner.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=sheamoisture+manuka+honey+conditioner',
    amazonUrl: 'https://www.amazon.com/s?k=sheamoisture+manuka+honey+mafura+oil+conditioner',
  },
  {
    name: "Don't Shrink Flaxseed Elongating Curling Gel",
    brand: "Aunt Jackie's",
    category: 'Styling',
    concern: ['Styling', 'Dryness'],
    benefit: 'Elongates and defines curls',
    description: 'Flaxseed-enriched curl gel that stretches natural curl patterns, reduces shrinkage and provides long-lasting hold without flaking.',
    priceKsh: 850,
    rating: 4.4,
    badge: 'Popular',
    badgeColor: '#FF9800',
    image: 'https://m.media-amazon.com/images/I/71GCwMaqQGL._SL1500_.jpg',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=aunt+jackies+dont+shrink+gel',
    amazonUrl: 'https://www.amazon.com/s?k=aunt+jackies+dont+shrink+flaxseed+gel',
  },
  {
    name: 'Peppermint Scalp Scrub',
    brand: 'Majestic Pure',
    category: 'Scalp Treatment',
    concern: ['Buildup', 'Flaking', 'Itching'],
    benefit: 'Exfoliates and refreshes the scalp',
    description: 'Sea salt and peppermint scalp scrub that exfoliates dead skin, removes stubborn buildup and stimulates circulation for a healthier scalp environment.',
    priceKsh: 1750,
    rating: 4.3,
    badge: 'Exfoliating',
    badgeColor: '#009688',
        image: 'https://rvmnirypyopqtozvldjs.supabase.co/storage/v1/object/public/product-images/mekis%20peppermint%20oil.webp',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=peppermint+scalp+scrub',
    amazonUrl: 'https://www.amazon.com/s?k=majestic+pure+peppermint+scalp+scrub',
  },
  {
    name: 'Phenomenal Thickening Shampoo',
    brand: 'Got2b',
    category: 'Shampoo',
    concern: ['Thinning', 'Buildup', 'Styling'],
    benefit: 'Adds volume to fine, flat hair',
    description: 'Thickening formula that cleanses buildup while adding body and fullness to fine or thinning natural hair.',
    priceKsh: 780,
    rating: 4.2,
    badge: 'Budget Pick',
    badgeColor: '#607D8B',
    image: 'https://m.media-amazon.com/images/I/71wBqNJNZeL._SL1500_.jpg',
    jumiaUrl: 'https://www.jumia.co.ke/catalog/?q=got2b+thickening+shampoo',
    amazonUrl: 'https://www.amazon.com/s?k=got2b+phenomenal+thickening+shampoo',
  },
];

const scoreProducts = (
  products: Omit<GeneratedProduct, 'id'>[],
  onboardingData: OnboardingData,
): (Omit<GeneratedProduct, 'id'> & { score: number })[] => {
  const userConcerns = [
    ...(onboardingData.goals || []),
    onboardingData.baselineItch !== 'None' ? 'Itching' : '',
    onboardingData.baselineHairHealth !== 'Healthy' ? 'Dryness' : '',
    onboardingData.baselineHairline !== 'No change' ? 'Thinning' : '',
  ].filter(Boolean).map(c => c.toLowerCase());

  return products.map(p => {
    let score = p.rating;
    p.concern.forEach(c => {
      if (userConcerns.some(uc => uc.includes(c.toLowerCase()) || c.toLowerCase().includes(uc))) {
        score += 1.5;
      }
    });
    return { ...p, score };
  });
};

export const useGeneratedProducts = (onboardingData: OnboardingData, count: number = 16) => {
  const [products, setProducts] = useState<GeneratedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      const scored = scoreProducts(PRODUCT_CATALOG, onboardingData)
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map((p, i) => ({ ...p, id: `product-${i}-${Date.now()}` }));

      setTimeout(() => {
        setProducts(scored);
        setLoading(false);
      }, 600);
    } catch (err) {
      console.error('Failed to generate products:', err);
      setError('Could not load products. Please try again.');
      setLoading(false);
    }
  }, [JSON.stringify(onboardingData), count]);

  useEffect(() => {
    generate();
  }, [generate]);

  return { products, loading, error, regenerate: generate };
};
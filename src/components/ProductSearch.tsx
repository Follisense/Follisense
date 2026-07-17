// src/components/ProductSearch.tsx
import { useState, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';

const dm = "'DM Sans', sans-serif";

interface Product {
  name:        string;
  brand:       string;
  category:    string;
  description: string;
}

const ALL_PRODUCTS: Product[] = [
  // ── Shampoos ──────────────────────────────────────────────────────────────
  { name: 'SheaMoisture Manuka Honey & Yogurt Hydrate & Repair Shampoo',     brand: 'SheaMoisture',       category: 'Shampoo',     description: 'Hydrating shampoo for low porosity and 4C hair' },
  { name: 'SheaMoisture Jamaican Black Castor Oil Strengthen Shampoo',        brand: 'SheaMoisture',       category: 'Shampoo',     description: 'Strengthening shampoo for damaged and thinning hair' },
  { name: 'SheaMoisture African Black Soap Bamboo Charcoal Shampoo',          brand: 'SheaMoisture',       category: 'Shampoo',     description: 'Clarifying shampoo for scalp buildup and dandruff' },
  { name: 'SheaMoisture Curl & Shine Shampoo',                                brand: 'SheaMoisture',       category: 'Shampoo',     description: 'Moisturising shampoo for curly hair' },
  { name: 'Cantu Shea Butter Sulfate-Free Cleansing Cream Shampoo',           brand: 'Cantu',              category: 'Shampoo',     description: 'Gentle cleansing for curly and coily hair' },
  { name: 'Cantu Care for Kids Tear-Free Nourishing Shampoo',                 brand: 'Cantu',              category: 'Shampoo',     description: 'Gentle shampoo for children with curly hair' },
  { name: 'Mielle Organics Babassu Oil & Mint Deep Conditioner',              brand: 'Mielle Organics',    category: 'Conditioner', description: 'Strengthening deep conditioner for natural hair' },
  { name: 'Mielle Organics Detangling Co-Wash',                               brand: 'Mielle Organics',    category: 'Co-wash',     description: 'Moisturising co-wash for natural hair' },
  { name: 'OGX Tea Tree Mint Shampoo',                                         brand: 'OGX',                category: 'Shampoo',     description: 'Scalp stimulating shampoo with tea tree and mint' },
  { name: 'OGX Coconut Milk Shampoo',                                          brand: 'OGX',                category: 'Shampoo',     description: 'Nourishing shampoo for dry and damaged hair' },
  { name: 'OGX Argan Oil of Morocco Shampoo',                                  brand: 'OGX',                category: 'Shampoo',     description: 'Smoothing shampoo with Moroccan argan oil' },
  { name: 'Nizoral Anti-Dandruff Shampoo',                                     brand: 'Nizoral',            category: 'Treatment',   description: 'Medicated ketoconazole shampoo for dandruff' },
  { name: 'Head & Shoulders Royal Oils Moisture Boost Shampoo',                brand: 'Head & Shoulders',   category: 'Shampoo',     description: 'Scalp care shampoo designed for natural hair' },
  { name: 'Briogeo Scalp Revival Charcoal + Tea Tree Scalp Treatment Shampoo', brand: 'Briogeo',            category: 'Shampoo',     description: 'Charcoal and tea tree shampoo for scalp buildup' },
  { name: 'Kinky Curly Come Clean Natural Moisturising Shampoo',               brand: 'Kinky Curly',        category: 'Shampoo',     description: 'Clarifying shampoo for curly and coily hair' },
  { name: 'Design Essentials Almond & Avocado Moisturising & Detangling Shampoo', brand: 'Design Essentials', category: 'Shampoo',  description: 'Moisturising shampoo for relaxed and natural hair' },
  { name: 'Crème of Nature Argan Oil Moisture & Shine Shampoo',                brand: 'Crème of Nature',    category: 'Shampoo',     description: 'Argan oil shampoo for shine and moisture' },
  { name: 'African Pride Black Castor Miracle Moisture & Seal Shampoo',        brand: 'African Pride',      category: 'Shampoo',     description: 'Moisturising shampoo with black castor oil' },
  { name: 'As I Am Coconut CoWash Cleansing Conditioner',                       brand: 'As I Am',            category: 'Co-wash',     description: 'Cleansing conditioner for natural hair' },
  { name: 'As I Am Dry & Itchy Scalp Care Olive & Tea Tree Oil Shampoo',        brand: 'As I Am',            category: 'Shampoo',     description: 'Shampoo for dry and itchy scalp' },
  { name: 'Neutrogena T/Sal Therapeutic Shampoo',                               brand: 'Neutrogena',         category: 'Treatment',   description: 'Salicylic acid shampoo for scalp buildup and psoriasis' },
  { name: 'Vichy Dercos Anti-Dandruff Shampoo',                                 brand: 'Vichy',              category: 'Treatment',   description: 'Dermatologist recommended anti-dandruff treatment' },
  { name: 'Avlon KeraCare Scalp Stimulating Shampoo',                           brand: 'Avlon',              category: 'Shampoo',     description: 'Scalp stimulating shampoo for hair growth' },
  { name: 'Bevel Scalp Care Shampoo',                                            brand: 'Bevel',              category: 'Shampoo',     description: 'Shampoo for Black men with sensitive scalp' },
  { name: 'Dove Amplified Textures Hydrating Cleanse Shampoo',                   brand: 'Dove',               category: 'Shampoo',     description: 'Hydrating shampoo for textured and coily hair' },
  { name: 'Garnier Fructis Sleek & Shine Fortifying Shampoo',                    brand: 'Garnier',            category: 'Shampoo',     description: 'Anti-frizz fortifying shampoo' },
  { name: 'TRESemmé Botanique Nourish & Replenish Shampoo',                      brand: 'TRESemmé',           category: 'Shampoo',     description: 'Nourishing shampoo with coconut milk and aloe vera' },
  { name: 'Pantene Gold Series Moisture Boost Shampoo',                          brand: 'Pantene',            category: 'Shampoo',     description: 'Hydrating shampoo for natural and relaxed textured hair' },
  { name: 'Dr Bronner\'s Pure Castile Liquid Soap Tea Tree',                     brand: 'Dr Bronner\'s',      category: 'Shampoo',     description: 'Gentle castile soap that doubles as a clarifying shampoo' },
  { name: 'Herbal Essences Bio:Renew Argan Oil Shampoo',                         brand: 'Herbal Essences',    category: 'Shampoo',     description: 'Argan oil enriched shampoo for dry hair' },

  // ── Conditioners & Leave-ins ───────────────────────────────────────────────
  { name: 'Cantu Shea Butter Leave-In Conditioning Repair Cream',               brand: 'Cantu',              category: 'Leave-in',    description: 'Repairing leave-in conditioner for all curl types' },
  { name: 'SheaMoisture Raw Shea Butter Deep Treatment Masque',                  brand: 'SheaMoisture',       category: 'Masque',      description: 'Intense moisture masque for dry 4C hair' },
  { name: 'SheaMoisture Manuka Honey & Yogurt Hydrate & Repair Masque',          brand: 'SheaMoisture',       category: 'Masque',      description: 'Repairing hair masque for low porosity hair' },
  { name: 'Mielle Organics Pomegranate & Honey Leave-In Conditioner',            brand: 'Mielle Organics',    category: 'Leave-in',    description: 'Detangling leave-in conditioner for natural hair' },
  { name: 'Aunt Jackie\'s Knot On My Watch Instant Detangling Therapy',          brand: 'Aunt Jackie\'s',     category: 'Detangler',   description: 'Slip-rich detangler for knots and tangles' },
  { name: 'Aunt Jackie\'s Don\'t Shrink Flaxseed Elongating Curling Gel',        brand: 'Aunt Jackie\'s',     category: 'Styler',      description: 'Curl defining gel with flaxseed for elongation' },
  { name: 'TGIN Butter Cream Daily Moisturiser',                                  brand: 'TGIN',               category: 'Moisturiser', description: 'Butter cream for dry and brittle natural hair' },
  { name: 'TGIN Green Tea Super Moist Leave-In Conditioner',                      brand: 'TGIN',               category: 'Leave-in',    description: 'Green tea and aloe leave-in for moisture' },
  { name: 'Olaplex No.3 Hair Perfector',                                          brand: 'Olaplex',            category: 'Treatment',   description: 'Bond repairing treatment for chemically treated hair' },
  { name: 'Olaplex No.5 Bond Maintenance Conditioner',                            brand: 'Olaplex',            category: 'Conditioner', description: 'Bond maintaining conditioner for all hair types' },
  { name: 'Briogeo Don\'t Despair Repair Deep Conditioning Masque',               brand: 'Briogeo',            category: 'Masque',      description: 'Strengthening masque for damaged hair' },
  { name: 'Camille Rose Algae Renew Deep Conditioner',                            brand: 'Camille Rose',       category: 'Conditioner', description: 'Algae and murumuru butter deep conditioner' },
  { name: 'Camille Rose Butter Cream Daily Hair Moisturiser',                     brand: 'Camille Rose',       category: 'Moisturiser', description: 'Daily moisturiser for dry and coily hair' },
  { name: 'Giovanni 2Chic Ultra-Moist Conditioner',                               brand: 'Giovanni',           category: 'Conditioner', description: 'Ultra moisturising conditioner for dry hair' },
  { name: 'Bounce Curl Light Creme Gel',                                          brand: 'Bounce Curl',        category: 'Styler',      description: 'Lightweight curl definer for wavy and curly hair' },
  { name: 'Kinky Curly Knot Today Leave In Conditioner',                          brand: 'Kinky Curly',        category: 'Leave-in',    description: 'Leave-in detangler for natural hair' },
  { name: 'ORS Olive Oil Replenishing Conditioner',                               brand: 'ORS',                category: 'Conditioner', description: 'Olive oil conditioner for dry and damaged hair' },
  { name: 'ORS Olive Oil Incredibly Rich Oil Moisturizing Hair Lotion',           brand: 'ORS',                category: 'Moisturiser', description: 'Rich moisturiser for protective styles' },
  { name: 'Luster\'s Pink Original Oil Moisturizer Hair Lotion',                  brand: 'Luster\'s',          category: 'Moisturiser', description: 'Classic oil moisturiser for natural and relaxed hair' },
  { name: 'Pantene Gold Series Deep Conditioner Masque',                          brand: 'Pantene',            category: 'Masque',      description: 'Deep conditioning masque for textured hair' },
  { name: 'Dove Amplified Textures Detangling Milk',                              brand: 'Dove',               category: 'Leave-in',    description: 'Lightweight detangling milk for textured hair' },
  { name: 'Design Essentials Natural Honey & Shea Edge Tamer',                    brand: 'Design Essentials',  category: 'Styler',      description: 'Honey and shea edge control for natural hair' },
  { name: 'Crème of Nature Pure Honey Moisture Whip Twisting Cream',              brand: 'Crème of Nature',    category: 'Styler',      description: 'Honey based twisting cream for definition' },
  { name: 'Taliah Waajid Kinky Wavy Natural Curl Sealer',                         brand: 'Taliah Waajid',      category: 'Styler',      description: 'Curl sealer for kinky and wavy natural hair' },
  { name: 'Aphogee Keratin 2 Minute Reconstructor',                               brand: 'Aphogee',            category: 'Treatment',   description: 'Protein treatment for damaged and brittle hair' },
  { name: 'Aphogee Two-Step Protein Treatment',                                    brand: 'Aphogee',            category: 'Treatment',   description: 'Intensive protein treatment for severely damaged hair' },

  // ── Scalp Oils & Serums ───────────────────────────────────────────────────
  { name: 'Jamaican Black Castor Oil Original',                                   brand: 'Tropic Isle Living', category: 'Scalp Oil',   description: 'Traditional Jamaican black castor oil for hair growth' },
  { name: 'Jamaican Black Castor Oil Lavender',                                   brand: 'Sunny Isle',         category: 'Scalp Oil',   description: 'Lavender infused castor oil for scalp and hair' },
  { name: 'Wild Growth Hair Oil',                                                  brand: 'Wild Growth',        category: 'Scalp Oil',   description: 'Lightweight scalp oil blend for hair growth' },
  { name: 'Mielle Organics Rosemary Mint Scalp & Hair Strengthening Oil',         brand: 'Mielle Organics',    category: 'Scalp Oil',   description: 'Rosemary and mint oil for scalp stimulation and growth' },
  { name: 'The Ordinary Multi-Peptide Serum for Hair Density',                    brand: 'The Ordinary',       category: 'Scalp Serum', description: 'Peptide serum to support hair density and scalp health' },
  { name: 'Kérastase Initialiste Advanced Scalp & Hair Concentrate',              brand: 'Kérastase',          category: 'Scalp Serum', description: 'Advanced scalp serum for hair quality and density' },
  { name: 'Philip Kingsley Scalp Toner',                                          brand: 'Philip Kingsley',    category: 'Scalp Tonic', description: 'Medicated toner for flaky and itchy scalp' },
  { name: 'Briogeo Scalp Revival Peppermint & Tea Tree Scalp Tonic',             brand: 'Briogeo',            category: 'Scalp Tonic', description: 'Cooling peppermint tonic for scalp irritation' },
  { name: 'Act+Acre Cold Processed Scalp Detox',                                  brand: 'Act+Acre',           category: 'Treatment',   description: 'Scalp detox treatment for buildup and sensitivity' },
  { name: 'Vatika Naturals Coconut Hair Oil',                                     brand: 'Vatika',             category: 'Hair Oil',    description: 'Coconut oil blend for scalp and hair strength' },
  { name: 'Vatika Black Seed Hair Oil',                                            brand: 'Vatika',             category: 'Scalp Oil',   description: 'Black seed oil for scalp nourishment and hair loss' },
  { name: 'Okay Pure Naturals Shea Oil for Hair & Skin',                          brand: 'Okay Pure Naturals', category: 'Hair Oil',    description: 'Shea butter oil for moisture and scalp care' },
  { name: 'Nioxin Scalp & Hair Treatment System 2',                               brand: 'Nioxin',             category: 'Treatment',   description: 'Scalp treatment for thinning natural hair' },
  { name: 'Rogaine Men\'s 5% Minoxidil Foam',                                     brand: 'Rogaine',            category: 'Treatment',   description: 'Clinically proven treatment for male pattern hair loss' },
  { name: 'Kirkland Minoxidil 5% Topical Solution',                               brand: 'Kirkland',           category: 'Treatment',   description: 'Generic minoxidil for hair loss and scalp health' },
  { name: 'Dax Pressed Hair & Scalp Conditioner',                                 brand: 'Dax',                category: 'Scalp Balm',  description: 'Classic scalp conditioner for dry scalp' },
  { name: 'Blue Magic Originals Bergamot Hair & Scalp Conditioner',               brand: 'Blue Magic',         category: 'Scalp Balm',  description: 'Bergamot conditioner for dry scalp and hair' },
  { name: 'Sulfur8 Medicated Anti-Dandruff Hair & Scalp Conditioner',             brand: 'Sulfur8',            category: 'Treatment',   description: 'Medicated scalp conditioner for dandruff and itch' },
  { name: 'Dudley\'s DRC 28 Hair & Scalp Treatment',                              brand: 'Dudley\'s',          category: 'Scalp Oil',   description: 'Lightweight scalp treatment for dry hair' },
  { name: 'Caribbean Coconut Oil',                                                 brand: 'Palmer\'s',          category: 'Hair Oil',    description: 'Pure coconut oil for scalp and hair moisture' },
  { name: 'Palmer\'s Coconut Oil Formula with Vitamin E',                          brand: 'Palmer\'s',          category: 'Hair Oil',    description: 'Vitamin E enriched coconut oil for hair and scalp' },
  { name: 'Fantasia IC Hair Polisher with Sparkle Lites',                         brand: 'Fantasia',           category: 'Hair Oil',    description: 'Lightweight hair polisher for shine and frizz control' },

  // ── Scalp Treatments ──────────────────────────────────────────────────────
  { name: 'Neutrogena T/Gel Therapeutic Shampoo',                                 brand: 'Neutrogena',         category: 'Treatment',   description: 'Coal tar shampoo for scalp psoriasis and seborrheic dermatitis' },
  { name: 'DHS Tar Shampoo',                                                       brand: 'DHS',                category: 'Treatment',   description: 'Coal tar shampoo for scalp conditions' },
  { name: 'Selsun Blue Medicated Dandruff Shampoo',                               brand: 'Selsun Blue',        category: 'Treatment',   description: 'Selenium sulfide shampoo for stubborn dandruff' },
  { name: 'Ducray Squanorm Anti-Dandruff Treatment Shampoo',                      brand: 'Ducray',             category: 'Treatment',   description: 'Zinc pyrithione shampoo for oily dandruff' },
  { name: 'Ducray Kertyol P.S.O. Shampoo',                                        brand: 'Ducray',             category: 'Treatment',   description: 'Keratolytic shampoo for scalp psoriasis' },
  { name: 'ISDIN Lambdapil Hair Loss Shampoo',                                    brand: 'ISDIN',              category: 'Treatment',   description: 'Shampoo for hair loss with biotin and saw palmetto' },
  { name: 'Plantur 39 Phyto-Caffeine Shampoo',                                    brand: 'Plantur',            category: 'Treatment',   description: 'Caffeine shampoo for thinning hair in women' },
  { name: 'Alpecin Caffeine Shampoo C1',                                           brand: 'Alpecin',            category: 'Treatment',   description: 'Caffeine shampoo for men with hereditary hair loss' },
  { name: 'Kiehl\'s Amino Acid Shampoo',                                           brand: 'Kiehl\'s',           category: 'Shampoo',     description: 'Gentle amino acid shampoo for frequent washing' },
  { name: 'Sunday Riley Clean Rinse Clarifying Scalp Serum',                      brand: 'Sunday Riley',       category: 'Scalp Serum', description: 'AHA scalp serum for buildup and flaking' },
  { name: 'Christophe Robin Cleansing Purifying Scrub',                           brand: 'Christophe Robin',   category: 'Scalp Scrub', description: 'Sea salt scalp scrub for buildup and oiliness' },
  { name: 'Ouai Scalp Serum',                                                      brand: 'Ouai',               category: 'Scalp Serum', description: 'Scalp serum for hair thinning and scalp health' },
  { name: 'Vegamour Gro Hair Serum',                                               brand: 'Vegamour',           category: 'Scalp Serum', description: 'Plant based serum for hair density and scalp health' },

  // ── Protective Style & Between Wash Care ──────────────────────────────────
  { name: 'Cantu Refresh & Revive Curl Revitalizer',                             brand: 'Cantu',              category: 'Refresh Spray', description: 'Curl refresher for second day hair under protective styles' },
  { name: 'African Pride Moisture Miracle Aloe & Coconut Oil Moisture Spray',    brand: 'African Pride',      category: 'Spray',         description: 'Moisturising spray for braids and locs' },
  { name: 'SheaMoisture Coconut & Hibiscus Frizz-Free Curl Mousse',              brand: 'SheaMoisture',       category: 'Styler',        description: 'Frizz free curl mousse for defined styles' },
  { name: 'Eco Styler Olive Oil Styling Gel',                                    brand: 'Eco Styler',         category: 'Styler',        description: 'Edge control and styling gel for natural hair' },
  { name: 'Eco Styler Black Castor & Flaxseed Oil Styling Gel',                  brand: 'Eco Styler',         category: 'Styler',        description: 'Castor oil gel for defined curls and edges' },
  { name: 'Murray\'s Beeswax',                                                    brand: 'Murray\'s',          category: 'Styler',        description: 'Traditional beeswax for locs and braids' },
  { name: 'Murray\'s Superior Hair Dressing Pomade',                              brand: 'Murray\'s',          category: 'Styler',        description: 'Classic pomade for waves and defined styles' },
  { name: 'Taliah Waajid Black Earth Products Loc It Up',                        brand: 'Taliah Waajid',      category: 'Styler',        description: 'Gel for loc maintenance and definition' },
  { name: 'Knotty Boy Dread Wax',                                                 brand: 'Knotty Boy',         category: 'Styler',        description: 'Wax for dreadlock formation and maintenance' },
  { name: 'Jamaican Mango & Lime Tingle Scalp Spray',                            brand: 'Jamaican Mango & Lime', category: 'Scalp Spray', description: 'Tingling scalp spray for itchy scalp under locs' },
  { name: 'ORS Lock & Twist Gel',                                                 brand: 'ORS',                category: 'Styler',        description: 'Gel for locs and twists' },
  { name: 'Creme of Nature Argan Oil Perfect 7-in-1 Leave-In Treatment',         brand: 'Crème of Nature',    category: 'Leave-in',      description: '7-in-1 leave-in treatment for damaged natural hair' },
  { name: 'Dark & Lovely Au Naturale Anti-Shrinkage Curl Defining Creme',        brand: 'Dark & Lovely',      category: 'Styler',        description: 'Anti-shrinkage curl defining cream for 4C hair' },

  // ── Men specific ──────────────────────────────────────────────────────────
  { name: 'Bevel Beard & Scalp Conditioner',                                     brand: 'Bevel',              category: 'Conditioner', description: 'Conditioner for scalp and beard care' },
  { name: 'Bevel Nourishing Hair Lotion',                                        brand: 'Bevel',              category: 'Moisturiser', description: 'Lightweight hair lotion for Black men' },
  { name: 'Duke Cannon Supply Co. Hair Pomade',                                  brand: 'Duke Cannon',        category: 'Styler',      description: 'Water based pomade for waves and defined styles' },
  { name: 'Cremo Barber Grade Hair Styling Clay',                                brand: 'Cremo',              category: 'Styler',      description: 'Matte clay for fades and short natural styles' },
  { name: 'Scottie\'s Wave Builder Pomade',                                      brand: 'Scottie\'s',         category: 'Styler',      description: 'Wave pomade for 360 waves' },
  { name: 'Wahl 3-in-1 Shampoo Conditioner & Body Wash',                        brand: 'Wahl',               category: 'Shampoo',     description: 'All-in-one for men with short hair' },
  { name: 'Suave Men 2-in-1 Shampoo & Conditioner',                             brand: 'Suave Men',          category: 'Shampoo',     description: 'Quick wash for men with low cut styles' },
  { name: 'Paul Mitchell Tea Tree Special Shampoo',                              brand: 'Paul Mitchell',      category: 'Shampoo',     description: 'Invigorating tea tree shampoo for scalp health' },
  { name: 'American Crew Classic Shampoo',                                       brand: 'American Crew',      category: 'Shampoo',     description: 'Classic shampoo for men with textured hair' },
  { name: 'American Crew Grooming Cream',                                        brand: 'American Crew',      category: 'Styler',      description: 'Light hold grooming cream for natural styles' },

  // ── Natural & DIY ingredients ─────────────────────────────────────────────
  { name: 'Pure Argan Oil 100% Organic',                                         brand: 'Pura D\'Or',         category: 'Hair Oil',    description: 'Pure organic argan oil for scalp and hair moisture' },
  { name: 'Pure Jojoba Oil',                                                      brand: 'Art Naturals',       category: 'Scalp Oil',   description: 'Pure jojoba oil that mimics the scalp natural sebum' },
  { name: 'Pure Rosemary Essential Oil',                                          brand: 'Maple Holistics',    category: 'Scalp Oil',   description: 'Rosemary essential oil for scalp circulation' },
  { name: 'Pure Tea Tree Essential Oil',                                           brand: 'Maple Holistics',    category: 'Scalp Oil',   description: 'Tea tree oil for scalp infection and dandruff' },
  { name: 'Pure Peppermint Essential Oil',                                         brand: 'Plant Therapy',      category: 'Scalp Oil',   description: 'Peppermint oil for scalp stimulation and cooling' },
  { name: 'Pure Aloe Vera Gel 100% Organic',                                      brand: 'Amara Organics',     category: 'Scalp Treatment', description: 'Pure aloe vera gel for scalp soothing and moisture' },
  { name: 'Raw Shea Butter Unrefined',                                            brand: 'Sky Organics',       category: 'Moisturiser', description: 'Unrefined shea butter for deep moisture' },
  { name: 'Castor Oil Cold Pressed 100% Pure',                                    brand: 'Kate Blanc Cosmetics', category: 'Scalp Oil', description: 'Cold pressed castor oil for scalp and hair growth' },
  { name: 'Pure Avocado Oil for Hair',                                            brand: 'Cliganic',           category: 'Hair Oil',    description: 'Avocado oil for deep moisture and scalp health' },
  { name: 'Grapeseed Oil for Hair',                                               brand: 'NOW Solutions',      category: 'Hair Oil',    description: 'Lightweight grapeseed oil for scalp and shine' },

  // ── African & Afro-Caribbean brands ───────────────────────────────────────
  { name: 'Shea Moisture Yucca & Baobab Thickening Shampoo',                    brand: 'SheaMoisture',       category: 'Shampoo',     description: 'Thickening shampoo for fine and low density hair' },
  { name: 'Sofn\'free \'n pretty Strengthening Shampoo',                        brand: 'Sofn\'free',         category: 'Shampoo',     description: 'Strengthening shampoo for relaxed hair' },
  { name: 'TCB Naturals Olive Oil Hair & Scalp Conditioner',                    brand: 'TCB',                category: 'Scalp Balm',  description: 'Olive oil scalp conditioner for dry scalp' },
  { name: 'Africa\'s Best Organics Olive Oil & Coconut Oil Conditioner',        brand: 'Africa\'s Best',     category: 'Conditioner', description: 'Olive and coconut oil conditioner for natural hair' },
  { name: 'Shea Radiance African Shea Butter Enriched Hair Cream',              brand: 'Shea Radiance',      category: 'Moisturiser', description: 'Shea butter hair cream from West Africa' },
  { name: 'Nubian Heritage African Black Soap Shampoo',                         brand: 'Nubian Heritage',    category: 'Shampoo',     description: 'Black soap shampoo for scalp detox' },
  { name: 'Nubian Heritage Coconut & Papaya Oil Lotion',                        brand: 'Nubian Heritage',    category: 'Moisturiser', description: 'Coconut and papaya moisturiser for hair and scalp' },
  { name: 'Darling Hair Naturals Scalp Serum',                                  brand: 'Darling',            category: 'Scalp Serum', description: 'Scalp serum widely used across East Africa' },
  { name: 'Kama Ayurveda Bringadi Intensive Hair Treatment',                    brand: 'Kama Ayurveda',      category: 'Scalp Oil',   description: 'Ayurvedic hair oil with bhringraj for scalp health' },
  { name: 'Amla Oil Traditional Indian Hair Oil',                               brand: 'Dabur',              category: 'Scalp Oil',   description: 'Amla oil for scalp nourishment and hair strength' },

  // ── Supplements ───────────────────────────────────────────────────────────
  { name: 'Nutrafol Women Hair Growth Supplement',                               brand: 'Nutrafol',           category: 'Supplement',  description: 'Clinically tested supplement for women hair thinning' },
  { name: 'Nutrafol Men Hair Growth Supplement',                                 brand: 'Nutrafol',           category: 'Supplement',  description: 'Supplement for men with thinning hair' },
  { name: 'Viviscal Extra Strength Hair Growth Supplement',                      brand: 'Viviscal',           category: 'Supplement',  description: 'Marine based supplement for hair growth' },
  { name: 'Sports Research Biotin 5000mcg',                                      brand: 'Sports Research',    category: 'Supplement',  description: 'High potency biotin for hair and nail growth' },
  { name: 'Ducray Anacaps Dietary Supplement for Hair',                         brand: 'Ducray',             category: 'Supplement',  description: 'French pharmacy supplement for hair and scalp health' },
  { name: 'Iron & Folic Acid Supplement',                                        brand: 'Vitabiotics',        category: 'Supplement',  description: 'Iron supplement for hair loss related to iron deficiency' },
  // ── Professional Salon Brands ─────────────────────────────────────────────
  { name: "L'Oréal Professionnel Serie Expert Lipidium Shampoo",               brand: "L'Oréal Professionnel", category: 'Shampoo',     description: 'Salon grade shampoo for dry and damaged hair' },
  { name: "L'Oréal Professionnel Mythic Oil Nourishing Shampoo",               brand: "L'Oréal Professionnel", category: 'Shampoo',     description: 'Luxurious oil infused shampoo for all hair types' },
  { name: "L'Oréal Professionnel Mythic Oil",                                   brand: "L'Oréal Professionnel", category: 'Hair Oil',    description: 'Iconic lightweight hair oil for shine and softness' },
  { name: 'Redken All Soft Shampoo',                                            brand: 'Redken',             category: 'Shampoo',     description: 'Softening shampoo for dry and brittle hair' },
  { name: 'Redken Extreme Strengthening Shampoo',                              brand: 'Redken',             category: 'Shampoo',     description: 'Strengthening shampoo for damaged hair' },
  { name: 'Redken Acidic Bonding Concentrate Shampoo',                         brand: 'Redken',             category: 'Shampoo',     description: 'Bond strengthening shampoo for chemically treated hair' },
  { name: 'Wella Professionals Invigo Nutri-Enrich Shampoo',                   brand: 'Wella Professionals', category: 'Shampoo',    description: 'Nourishing shampoo for dry hair' },
  { name: 'Wella Professionals Fusion Intense Repair Shampoo',                 brand: 'Wella Professionals', category: 'Shampoo',    description: 'Intense repair shampoo for highly damaged hair' },
  { name: 'Schwarzkopf Professional Bonacure Moisture Kick Shampoo',           brand: 'Schwarzkopf Professional', category: 'Shampoo', description: 'Hydrating shampoo for normal to dry hair' },
  { name: 'Matrix Biolage Hydrasource Shampoo',                                brand: 'Matrix',             category: 'Shampoo',     description: 'Hydrating shampoo inspired by aloe for dry hair' },
  { name: 'Matrix Biolage Smoothproof Shampoo',                                brand: 'Matrix',             category: 'Shampoo',     description: 'Smoothing shampoo for frizzy hair' },
  { name: 'Joico K-Pak Clarifying Shampoo',                                    brand: 'Joico',              category: 'Shampoo',     description: 'Clarifying shampoo that removes buildup and residue' },
  { name: 'Moroccanoil Moisture Repair Shampoo',                               brand: 'Moroccanoil',        category: 'Shampoo',     description: 'Argan oil infused shampoo for damaged hair' },
  { name: 'Moroccanoil Treatment Oil Original',                                 brand: 'Moroccanoil',        category: 'Hair Oil',    description: 'Iconic argan oil treatment for shine and frizz control' },
  { name: 'Kevin Murphy Hydrate-Me Wash Shampoo',                              brand: 'Kevin Murphy',       category: 'Shampoo',     description: 'Hydrating shampoo for dry and coarse hair' },
  { name: 'Aveda Botanical Repair Strengthening Shampoo',                      brand: 'Aveda',              category: 'Shampoo',     description: 'Plant powered strengthening shampoo for damaged hair' },
  { name: 'Aveda Rosemary Mint Purifying Shampoo',                             brand: 'Aveda',              category: 'Shampoo',     description: 'Purifying shampoo with rosemary and mint for scalp health' },

  // ── Afro & Curly Hair Brands ──────────────────────────────────────────────
  { name: 'Afrocenchix Swish Shampoo',                                          brand: 'Afrocenchix',        category: 'Shampoo',     description: 'Natural shampoo for Afro and curly hair made in the UK' },
  { name: 'Afrocenchix Moisture Rich Conditioner',                              brand: 'Afrocenchix',        category: 'Conditioner', description: 'Moisturising conditioner for natural Afro hair' },
  { name: 'Curlsmith Curl Quenching Conditioning Wash',                         brand: 'Curlsmith',          category: 'Co-wash',     description: 'Conditioning wash for curly and coily hair' },
  { name: 'Curlsmith Hydro Style Flexi Jelly',                                  brand: 'Curlsmith',          category: 'Styler',      description: 'Flexible hold jelly for defined curls' },
  { name: 'Flora & Curl Sweet Hibiscus Curl Defining Butter Cream',             brand: 'Flora & Curl',       category: 'Styler',      description: 'Curl defining butter for 3C to 4C hair' },
  { name: 'Flora & Curl African Citrus Superfruit Shampoo',                     brand: 'Flora & Curl',       category: 'Shampoo',     description: 'Gentle clarifying shampoo for natural hair' },
  { name: 'Mielle Organics Babassu & Mint Styling Gel',                         brand: 'Mielle Organics',    category: 'Styler',      description: 'Defining gel for natural curls and coils' },
  { name: 'Camille Rose Curl Maker Moisturising Curl Jelly',                    brand: 'Camille Rose',       category: 'Styler',      description: 'Moisturising curl jelly for definition and shine' },
  { name: "Uncle Funky's Daughter Curly Magic Curl Stimulator",                 brand: "Uncle Funky's Daughter", category: 'Styler', description: 'Curl stimulator for wavy to coily hair' },
  { name: 'Pattern Beauty Curl Gel',                                            brand: 'Pattern Beauty',     category: 'Styler',      description: 'Curl gel by Tracee Ellis Ross for tight curls and coils' },
  { name: 'Pattern Beauty Hydration Shampoo',                                   brand: 'Pattern Beauty',     category: 'Shampoo',     description: 'Hydrating shampoo for curly and coily hair' },
  { name: 'Pattern Beauty Heavy Conditioner',                                   brand: 'Pattern Beauty',     category: 'Conditioner', description: 'Rich conditioner for tight curls and coils' },
  { name: 'Jessicurl Too Shea Extra Moisturizing Conditioner',                  brand: 'Jessicurl',          category: 'Conditioner', description: 'Extra moisturising conditioner for dry curly hair' },

  // ── Mass Market Everyday Brands ───────────────────────────────────────────
  { name: 'Sunsilk Nourishing Soft & Smooth Shampoo',                          brand: 'Sunsilk',            category: 'Shampoo',     description: 'Everyday shampoo for smooth and soft hair' },
  { name: 'Sunsilk Stunning Black Shine Shampoo',                              brand: 'Sunsilk',            category: 'Shampoo',     description: 'Shampoo for dark and black hair shine' },
  { name: "L'Oréal Paris Elvive Total Repair 5 Shampoo",                       brand: "L'Oréal Paris",      category: 'Shampoo',     description: 'Repairing shampoo for damaged hair' },
  { name: "L'Oréal Paris Elvive Extraordinary Oil Shampoo",                    brand: "L'Oréal Paris",      category: 'Shampoo',     description: 'Oil enriched shampoo for dry and frizzy hair' },
  { name: "L'Oréal Paris Elvive Dream Lengths Shampoo",                        brand: "L'Oréal Paris",      category: 'Shampoo',     description: 'Shampoo for long hair prone to breakage' },
  { name: 'Palmolive Naturals Silky Straight Shampoo',                         brand: 'Palmolive',          category: 'Shampoo',     description: 'Everyday shampoo with natural ingredients' },
  { name: 'Vatika Naturals Black Seed Shampoo',                                brand: 'Vatika',             category: 'Shampoo',     description: 'Black seed shampoo for scalp nourishment' },
  { name: 'Vatika Naturals Garlic Shampoo',                                    brand: 'Vatika',             category: 'Shampoo',     description: 'Garlic infused shampoo for hair fall control' },
  { name: 'Nice & Lovely Smooth & Shine Hair Lotion',                          brand: 'Nice & Lovely',      category: 'Moisturiser', description: 'Affordable everyday hair lotion popular across East Africa' },
  { name: 'Nice & Lovely Coconut Oil Hair Food',                               brand: 'Nice & Lovely',      category: 'Scalp Balm',  description: 'Coconut oil hair food for dry scalp care' },
  { name: 'SoftSheen-Carson Optimum Care Anti-Breakage Strengthening Conditioner', brand: 'SoftSheen-Carson', category: 'Conditioner', description: 'Strengthening conditioner for relaxed hair' },

  // ── Barbershop & Men Grooming ─────────────────────────────────────────────
  { name: 'Suavecito Original Hold Pomade',                                     brand: 'Suavecito',          category: 'Styler',      description: 'Water based pomade for medium hold styles' },
  { name: 'Suavecito Firme Hold Pomade',                                        brand: 'Suavecito',          category: 'Styler',      description: 'Strong hold water based pomade for defined styles' },
  { name: 'Layrite Original Pomade',                                            brand: 'Layrite',            category: 'Styler',      description: 'Barber grade pomade for all hair types' },
  { name: 'Reuzel Pink Pomade',                                                 brand: 'Reuzel',             category: 'Styler',      description: 'Medium hold water soluble pomade' },
  { name: 'Reuzel Blue Pomade',                                                 brand: 'Reuzel',             category: 'Styler',      description: 'Strong hold water soluble pomade for sculpted styles' },
  { name: 'Uppercut Deluxe Pomade',                                             brand: 'Uppercut Deluxe',    category: 'Styler',      description: 'Strong hold pomade for defined hairstyles' },
  { name: "Sportin' Waves Gel Pomade",                                          brand: "Sportin' Waves",     category: 'Styler',      description: 'Wave gel for 360 waves and defined curl patterns' },
  { name: "Cantu Men's Collection 3-in-1 Shampoo Conditioner & Body Wash",     brand: "Cantu Men's",        category: 'Shampoo',     description: '3-in-1 wash for men with textured hair' },
  { name: "Cantu Men's Collection Leave-In Conditioner",                        brand: "Cantu Men's",        category: 'Leave-in',    description: 'Leave-in conditioner for men with natural hair' },

  // ── Natural Oils & African Staples ────────────────────────────────────────
  { name: 'Extra Virgin Olive Oil for Hair',                                    brand: 'Generic',            category: 'Hair Oil',    description: 'Pure olive oil for scalp moisture and hot oil treatments' },
  { name: 'Henna Powder for Hair Strengthening',                               brand: 'Generic',            category: 'Treatment',   description: 'Natural henna for hair strengthening and colour' },
  { name: 'Fenugreek Seed Oil',                                                brand: 'Generic',            category: 'Scalp Oil',   description: 'Fenugreek oil for scalp nourishment and hair growth' },
  { name: 'Baobab Oil for Hair',                                               brand: 'Generic',            category: 'Hair Oil',    description: 'African baobab oil for deep moisture and shine' },
  { name: 'Moringa Oil for Scalp & Hair',                                      brand: 'Generic',            category: 'Scalp Oil',   description: 'Moringa oil for scalp nourishment and hair growth' },
  { name: 'Neem Oil for Scalp',                                                brand: 'Generic',            category: 'Scalp Oil',   description: 'Neem oil for scalp infections dandruff and irritation' },
  { name: 'Amla Hair Oil Enriched',                                            brand: 'Dabur',              category: 'Scalp Oil',   description: 'Amla enriched oil for scalp health and hair strength' },
  { name: 'Brahmi Amla Hair Oil',                                              brand: 'Dabur',              category: 'Scalp Oil',   description: 'Brahmi and amla blend for scalp nourishment' },

  // ── Locs & Braids Care ────────────────────────────────────────────────────
  { name: 'Lion Locs Organic Loc Shampoo',                                     brand: 'Lion Locs',          category: 'Shampoo',     description: 'Residue free shampoo for dreadlocks and locs' },
  { name: 'Locsanity Rosemary Mint Daily Moisturising Spray',                  brand: 'Locsanity',          category: 'Scalp Spray', description: 'Daily moisturising spray for locs and scalp' },
  { name: 'Bronner Brothers Locking Gel',                                       brand: 'Bronner Bros',       category: 'Styler',      description: 'Locking gel for starter locs and loc maintenance' },
  { name: 'African Pride Olive Miracle Braid Sheen Spray',                     brand: 'African Pride',      category: 'Spray',       description: 'Braid sheen spray for shine and moisture' },
  { name: 'Shine n Jam Magic Fingers Conditioning Braid Gel',                  brand: 'Shine n Jam',        category: 'Styler',      description: 'Conditioning gel for braiding and edge control' },
  { name: 'Style Factor Edge Booster Water Based Pomade',                      brand: 'Style Factor',       category: 'Styler',      description: 'Strong edge control for sleek styles and braids' },
  { name: 'Jamaican Mango & Lime Resistant Formula Locking Gel',               brand: 'Jamaican Mango & Lime', category: 'Styler',   description: 'Strong hold locking gel for loc formation' },
  { name: 'Jamaican Mango & Lime Island Oil Loc Detangler',                    brand: 'Jamaican Mango & Lime', category: 'Hair Oil', description: 'Oil detangler for locs and protective styles' },

  // ── Kids Hair Products ────────────────────────────────────────────────────
  { name: 'Just For Me Curl Peace Detangling Pudding',                         brand: 'Just For Me',        category: 'Detangler',   description: 'Gentle detangling pudding for children with curly hair' },
  { name: 'Cantu Care for Kids Curl Activating Detangling Spray',              brand: 'Cantu Kids',         category: 'Detangler',   description: 'Detangling spray for children with natural hair' },
  { name: 'Cantu Care for Kids Moisturising Leave-In Conditioner',             brand: 'Cantu Kids',         category: 'Leave-in',    description: 'Gentle leave-in for children with curly and coily hair' },
  { name: 'SheaMoisture Kids Extra-Moisturizing Detangler',                    brand: 'SheaMoisture Kids',  category: 'Detangler',   description: 'Extra gentle detangler for children with natural hair' },
  { name: 'SheaMoisture Kids Moisturising Conditioner',                        brand: 'SheaMoisture Kids',  category: 'Conditioner', description: 'Gentle moisturising conditioner for kids curly hair' },
  { name: 'SoCozy Curl Shampoo for Kids',                                      brand: 'SoCozy',             category: 'Shampoo',     description: 'Gentle curl shampoo formulated for children' },
  { name: 'SoCozy Curl Conditioner for Kids',                                  brand: 'SoCozy',             category: 'Conditioner', description: 'Gentle curl conditioner for children with curly hair' },

  // ── Kenyan & East African Brands ─────────────────────────────────────────
  { name: "Lory's Coconut Oil Hair Food",                    brand: "Lory's",              category: 'Scalp Balm',  description: 'Popular Kenyan coconut oil hair food for dry scalp and hair' },
  { name: "Lory's Olive Oil Hair Food",                      brand: "Lory's",              category: 'Scalp Balm',  description: 'Olive oil hair food widely used across East Africa' },
  { name: "Lory's Avocado Hair Food",                        brand: "Lory's",              category: 'Scalp Balm',  description: 'Avocado enriched hair food for moisture and growth' },
  { name: "Lory's Castor Oil Hair Food",                     brand: "Lory's",              category: 'Scalp Oil',   description: 'Castor oil hair food for scalp nourishment and thickness' },
  { name: "Lory's Shea Butter Hair Food",                    brand: "Lory's",              category: 'Scalp Balm',  description: 'Shea butter hair food for dry and brittle hair' },
  { name: 'Black Essentials Castor Oil Hair Growth Serum',   brand: 'Black Essentials',    category: 'Scalp Serum', description: 'Kenyan brand scalp serum for hair growth and scalp health' },
  { name: 'Black Essentials Rosemary Hair Oil',              brand: 'Black Essentials',    category: 'Scalp Oil',   description: 'Rosemary infused oil for scalp stimulation and growth' },
  { name: 'Black Essentials Jamaican Castor Oil Blend',      brand: 'Black Essentials',    category: 'Scalp Oil',   description: 'Castor oil blend for thick and healthy hair growth' },
  { name: 'Black Essentials Tea Tree Scalp Tonic',           brand: 'Black Essentials',    category: 'Scalp Tonic', description: 'Tea tree tonic for itchy and flaky scalp' },
  { name: 'Darling Silky Hair Relaxer',                      brand: 'Darling',             category: 'Treatment',   description: 'Relaxer widely used across East and West Africa' },
  { name: 'Darling Braid & Twist Gel',                       brand: 'Darling',             category: 'Styler',      description: 'Gel for braiding and twist styles across African markets' },
  { name: 'Miadi Hair Products Scalp Treatment',             brand: 'Miadi',               category: 'Treatment',   description: 'Kenyan brand scalp treatment for hair and scalp health' },
  { name: 'Miadi Coconut & Shea Hair Cream',                 brand: 'Miadi',               category: 'Moisturiser', description: 'Kenyan natural hair cream for moisture and softness' },
  { name: 'Truzone Argan Oil Shampoo',                       brand: 'Truzone',             category: 'Shampoo',     description: 'Argan oil shampoo popular in East African salons' },
  { name: 'Truzone Protein Reconstructor Treatment',         brand: 'Truzone',             category: 'Treatment',   description: 'Protein treatment for damaged and over-processed hair' },

  // ── West & Central African Brands ────────────────────────────────────────
  { name: 'Eva Pure Coconut Oil',                            brand: 'Eva',                 category: 'Hair Oil',    description: 'Pure coconut oil popular across West Africa' },
  { name: 'Eva Relaxer Super Strength',                      brand: 'Eva',                 category: 'Treatment',   description: 'Widely used relaxer across Nigeria and West Africa' },
  { name: 'Revlon Realistic Conditioning Relaxer',           brand: 'Revlon',              category: 'Treatment',   description: 'Popular relaxer used across West and Central Africa' },
  { name: 'TCB No Base Creme Relaxer',                       brand: 'TCB',                 category: 'Treatment',   description: 'No base relaxer for straightening natural hair' },
  { name: 'Motions Neutralizing Shampoo',                    brand: 'Motions',             category: 'Shampoo',     description: 'Neutralising shampoo used after relaxer treatments' },
  { name: 'Motions Oil Moisturizer Hair Lotion',             brand: 'Motions',             category: 'Moisturiser', description: 'Lightweight oil lotion for relaxed hair' },
  { name: 'Vitale Olive Oil Relaxer',                        brand: 'Vitale',              category: 'Treatment',   description: 'Olive oil enriched relaxer for dry and coarse hair' },
  { name: 'Soft & Beautiful Botanicals Conditioning Relaxer', brand: 'Soft & Beautiful',   category: 'Treatment',   description: 'Botanical relaxer popular across African markets' },
  { name: 'Organics Hair Mayonnaise',                        brand: "Africa's Best Organics", category: 'Masque',  description: 'Protein and moisture masque widely used in Africa' },
  { name: 'ORS HAIRestore Full Thickness Shampoo',           brand: 'ORS',                 category: 'Shampoo',     description: 'Strengthening shampoo for thinning hair' },

  // ── South African Brands ──────────────────────────────────────────────────
  { name: 'Inecto Pure Coconut Oil Shampoo',                 brand: 'Inecto',              category: 'Shampoo',     description: 'Coconut oil shampoo popular across South Africa' },
  { name: 'Inecto Pure Coconut Oil Conditioner',             brand: 'Inecto',              category: 'Conditioner', description: 'Coconut oil conditioner for dry hair' },
  { name: 'Placenta No More Breakage Shampoo',               brand: 'Placenta',            category: 'Shampoo',     description: 'Strengthening shampoo popular in South African salons' },
  { name: 'Tresemme Keratin Smooth Shampoo',                 brand: 'TRESemmé',            category: 'Shampoo',     description: 'Keratin smoothing shampoo widely used in South Africa' },
  { name: 'Blossom & Berry Scalp Serum',                     brand: 'Blossom & Berry',     category: 'Scalp Serum', description: 'South African natural scalp serum for hair growth' },
  { name: "Dr Teal's Coconut Oil Hair Mask",                brand: "Dr Teal's",          category: 'Masque',      description: 'Coconut oil hair mask widely available in Africa' },

  // ── Asian Brands (Indian, Korean, Japanese) ───────────────────────────────
  { name: 'Dove Elixir Hair Oil Nourishment',                brand: 'Dove',                category: 'Hair Oil',    description: 'Hair oil popular in India and Asian markets' },
  { name: 'Parachute Advansed Jasmine Coconut Hair Oil',     brand: 'Parachute',           category: 'Scalp Oil',   description: 'Jasmine coconut oil popular across South and East Asia' },
  { name: 'Parachute Advansed Aloe Vera Enriched Coconut Oil', brand: 'Parachute',         category: 'Scalp Oil',   description: 'Aloe vera coconut oil blend for scalp nourishment' },
  { name: 'Indulekha Bringha Hair Oil',                      brand: 'Indulekha',           category: 'Scalp Oil',   description: 'Ayurvedic hair oil with bhringraj for hair fall control' },
  { name: 'Mamaearth Onion Hair Oil for Hair Regrowth',      brand: 'Mamaearth',           category: 'Scalp Oil',   description: 'Onion oil for hair regrowth and scalp nourishment' },
  { name: 'Mamaearth Onion Shampoo for Hair Fall Control',   brand: 'Mamaearth',           category: 'Shampoo',     description: 'Onion shampoo for hair fall and scalp health' },
  { name: 'WOW Skin Science Apple Cider Vinegar Shampoo',    brand: 'WOW Skin Science',    category: 'Shampoo',     description: 'ACV shampoo for scalp detox and shine' },
  { name: 'WOW Skin Science Red Onion Black Seed Hair Oil',  brand: 'WOW Skin Science',    category: 'Scalp Oil',   description: 'Red onion and black seed oil for hair growth' },
  { name: 'Biotique Bio Bhringraj Therapeutic Oil',          brand: 'Biotique',            category: 'Scalp Oil',   description: 'Ayurvedic therapeutic oil for hair fall and scalp health' },
  { name: 'Biotique Bio Kelp Protein Shampoo',               brand: 'Biotique',            category: 'Shampoo',     description: 'Protein shampoo for hair fall control' },
  { name: 'Shiseido Tsubaki Premium Moist Shampoo',          brand: 'Shiseido',            category: 'Shampoo',     description: 'Japanese camellia oil shampoo for smooth and shiny hair' },
  { name: 'Shiseido Tsubaki Premium Repair Mask',            brand: 'Shiseido',            category: 'Masque',      description: 'Japanese camellia oil repair mask for damaged hair' },
  { name: 'Pantene Miracles Biotin Strength Shampoo',        brand: 'Pantene',             category: 'Shampoo',     description: 'Biotin strengthening shampoo popular in Asian markets' },
  { name: 'Head & Shoulders Smooth & Silky Shampoo',         brand: 'Head & Shoulders',    category: 'Shampoo',     description: 'Smooth and silky variant widely used across Asia and Africa' },
  { name: 'Kracie Ichikami Moisturising Shampoo',            brand: 'Kracie',              category: 'Shampoo',     description: 'Japanese rice water shampoo for moisture and shine' },
  { name: 'Oshima Tsubaki Premium Camellia Hair Oil',        brand: 'Oshima Tsubaki',      category: 'Hair Oil',    description: 'Premium Japanese camellia oil for scalp and hair shine' },
  { name: 'Mise en Scene Perfect Serum Original',            brand: 'Mise en Scene',       category: 'Hair Oil',    description: 'Korean hair serum for frizz control and shine' },
  { name: 'Lador TripleX3 Natural Shampoo',                  brand: 'Lador',               category: 'Shampoo',     description: 'Korean salon shampoo for scalp care and hair growth' },
  { name: 'Lador Scalp Scaling Spa',                         brand: 'Lador',               category: 'Scalp Scrub', description: 'Korean scalp scrub for deep cleansing and scalp health' },
  { name: 'AMOS Professional Pure Black Shampoo',            brand: 'AMOS Professional',   category: 'Shampoo',     description: 'Korean professional shampoo for scalp health and density' },
  { name: 'Himalaya Anti-Hair Fall Shampoo',                 brand: 'Himalaya',            category: 'Shampoo',     description: 'Herbal shampoo for hair fall widely available across Africa and Asia' },
  { name: 'Himalaya Protein Hair Cream',                     brand: 'Himalaya',            category: 'Moisturiser', description: 'Protein hair cream for smooth and nourished hair' },
  { name: 'Clinic Plus Strength & Shine Shampoo',            brand: 'Clinic Plus',         category: 'Shampoo',     description: 'Widely used everyday shampoo across Africa and South Asia' },

  // ── Hair Growth Serums ────────────────────────────────────────────────────
  { name: 'BondiBoost Hair Growth Stimulating Shampoo',                        brand: 'BondiBoost',         category: 'Shampoo',     description: 'Scalp stimulating shampoo for hair growth' },
  { name: 'BondiBoost Hair Growth Serum',                                      brand: 'BondiBoost',         category: 'Scalp Serum', description: 'Growth serum with caffeine and biotin for thinning hair' },
  { name: 'Vegamour GRO+ Advanced Hair Serum',                                 brand: 'Vegamour',           category: 'Scalp Serum', description: 'Advanced plant based serum for hair density' },

];

// ─── Category tab groups ─────────────────────────────────────────────────────
const TAB_GROUPS = [
  { label: 'Shampoos',    categories: ['Shampoo', 'Co-wash'] },
  { label: 'Conditioners', categories: ['Conditioner', 'Leave-in', 'Detangler', 'Masque'] },
  { label: 'Oils',        categories: ['Scalp Oil', 'Hair Oil', 'Scalp Balm'] },
  { label: 'Treatments',  categories: ['Treatment', 'Scalp Serum', 'Scalp Tonic', 'Scalp Spray', 'Scalp Scrub', 'Scalp Treatment'] },
  { label: 'Styling',     categories: ['Styler', 'Moisturiser', 'Refresh Spray', 'Spray'] },
  { label: 'Supplements', categories: ['Supplement'] },
];

interface Props {
  category:         'scalp' | 'hair';
  selectedProducts: string[];
  onProductsChange: (products: string[]) => void;
  darkMode?:        boolean;
}

const ProductSearch = ({ category, selectedProducts, onProductsChange, darkMode = false }: Props) => {
  const [query, setQuery]       = useState('');
  const [activeTab, setActiveTab] = useState('Shampoos');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (q) {
      return ALL_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      ).slice(0, 40);
    }
    const group = TAB_GROUPS.find(g => g.label === activeTab);
    if (!group) return [];
    return ALL_PRODUCTS.filter(p => group.categories.includes(p.category));
  }, [query, activeTab]);

  const toggle = (name: string) => {
    if (selectedProducts.includes(name)) {
      onProductsChange(selectedProducts.filter(p => p !== name));
    } else {
      onProductsChange([...selectedProducts, name]);
    }
  };

  const bg        = darkMode ? '#1C1814'                 : '#fff';
  const border    = darkMode ? 'rgba(212,168,102,0.2)'   : '#E8DED1';
  const inputBg   = darkMode ? 'rgba(255,255,255,0.05)'  : '#F8F5F1';
  const ink       = darkMode ? '#F5EFE6'                 : '#1C1C1C';
  const muted     = darkMode ? 'rgba(245,239,230,0.45)'  : '#999';
  const selBg     = darkMode ? 'rgba(212,168,102,0.15)'  : 'rgba(127,168,150,0.1)';
  const selBorder = darkMode ? 'rgba(212,168,102,0.5)'   : '#7fa896';
  const tabActiveBg     = darkMode ? 'rgba(212,168,102,0.2)'  : 'rgba(127,168,150,0.12)';
  const tabActiveBorder = darkMode ? 'rgba(212,168,102,0.5)'  : '#7fa896';
  const tabActiveColor  = darkMode ? '#D4A866'                 : '#7fa896';
  const gold      = '#D4A866';
  const accent    = darkMode ? gold : '#7fa896';

  return (
    <div style={{ fontFamily: dm }}>
      <style>{`.product-search-list::-webkit-scrollbar { display: none; } .tab-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} color={muted} strokeWidth={1.8} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search any product or brand..."
          style={{ width: '100%', height: 42, padding: '0 36px 0 38px', borderRadius: 12, border: `1.5px solid ${border}`, background: inputBg, fontFamily: dm, fontSize: 13, color: ink, outline: 'none', boxSizing: 'border-box' }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={13} color={muted} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Category tabs,hidden when searching */}
      {!query && (
        <div className="tab-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 8, scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
          {TAB_GROUPS.map(tab => (
            <button key={tab.label} onClick={() => setActiveTab(tab.label)}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 100, border: `1.5px solid ${activeTab === tab.label ? tabActiveBorder : border}`, background: activeTab === tab.label ? tabActiveBg : 'transparent', fontFamily: dm, fontSize: 11, fontWeight: 600, color: activeTab === tab.label ? tabActiveColor : muted, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results list */}
      <div className="product-search-list" style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, borderRadius: 12, border: `1px solid ${border}`, background: bg, padding: 6, scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <p style={{ fontFamily: dm, fontSize: 12, color: muted, textAlign: 'center', margin: 0 }}>No results for "{query}"</p>
            {query.trim() && (
              <button onClick={() => { toggle(query.trim()); setQuery(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 100, border: `1.5px solid ${selBorder}`, background: selBg, cursor: 'pointer', fontFamily: dm, fontSize: 12, fontWeight: 600, color: accent }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add "{query.trim()}"
              </button>
            )}
          </div>
        ) : (
          filtered.map(product => {
            const selected = selectedProducts.includes(product.name);
            return (
              <button key={product.name} onClick={() => toggle(product.name)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${selected ? selBorder : 'transparent'}`, background: selected ? selBg : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${selected ? accent : border}`, background: selected ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                  {selected && <Check size={11} color="#fff" strokeWidth={2.5} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: dm, fontSize: 12, fontWeight: 600, color: selected ? (darkMode ? gold : '#7fa896') : ink, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                  <p style={{ fontFamily: dm, fontSize: 10, color: muted, margin: 0 }}>{product.brand} · {product.category}</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {selectedProducts.length > 0 && (
        <p style={{ fontFamily: dm, fontSize: 11, color: accent, fontWeight: 600, margin: '8px 0 0', textAlign: 'right' }}>
          {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
};

export default ProductSearch;
/**
 * Seed: default categories, settings and the owner account.
 * Sample business data (suppliers, products, transactions) is added per module below.
 * Safe to run more than once (upserts).
 */
import { Prisma, PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPPLIER_CATEGORIES = [
  "Peças lisas / têxteis",
  "Tintas e consumíveis",
  "Transfers e vinil",
  "Embalagem",
  "Máquinas e manutenção",
  "Transportes",
  "Serviços",
];

const PRODUCT_CATEGORIES = ["T-shirts", "Sweats e hoodies", "Fardas", "Bonés", "Canecas", "Sacos", "Crachás e pins", "Merchandising"];

const TRANSACTION_CATEGORIES: Record<TransactionType, { name: string; children?: string[] }[]> = {
  INCOME: [
    { name: "Vendas", children: ["Vestuário", "Canecas e brindes", "Fardas", "Outros"] },
    { name: "Outras receitas" },
  ],
  EXPENSE: [
    { name: "Materiais", children: ["Peças lisas", "Tintas e consumíveis", "Transfers e vinil", "Embalagem"] },
    { name: "Equipamento", children: ["Compra", "Manutenção"] },
    { name: "Renda" },
    { name: "Software e subscrições" },
    { name: "Marketing" },
    { name: "Transportes e envios" },
    { name: "Impostos e taxas" },
    { name: "Salários" },
    { name: "Contabilidade" },
    { name: "Outras despesas" },
  ],
};

export const DEFAULT_SETTINGS = {
  defaultVatRateBp: 2300,
  marginWarningBp: 3000, // warn below 30 %
  labourHourlyRateCents: 1500, // 15 €/h
};

async function seedReferenceData() {
  for (const [i, name] of SUPPLIER_CATEGORIES.entries()) {
    await prisma.supplierCategory.upsert({ where: { name }, update: {}, create: { name, sortOrder: i } });
  }
  for (const [i, name] of PRODUCT_CATEGORIES.entries()) {
    await prisma.productCategory.upsert({ where: { name }, update: {}, create: { name, sortOrder: i } });
  }
  for (const type of [TransactionType.INCOME, TransactionType.EXPENSE]) {
    for (const [i, cat] of TRANSACTION_CATEGORIES[type].entries()) {
      // Unique indexes allow duplicate NULLs, so look up top-level categories by hand.
      const parent =
        (await prisma.transactionCategory.findFirst({ where: { type, parentId: null, name: cat.name } })) ??
        (await prisma.transactionCategory.create({ data: { type, name: cat.name, isDefault: true, sortOrder: i } }));
      for (const [j, child] of (cat.children ?? []).entries()) {
        await prisma.transactionCategory.upsert({
          where: { type_parentId_name: { type, parentId: parent.id, name: child } },
          update: {},
          create: { type, name: child, parentId: parent.id, isDefault: true, sortOrder: j },
        });
      }
    }
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: JSON.stringify(value) } });
  }
}

async function seedOwner() {
  const email = process.env.SEED_OWNER_EMAIL?.toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!email || !password) {
    console.warn("SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD not set: skipping owner account.");
    return;
  }
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.SEED_OWNER_NAME ?? "Administrador",
      passwordHash: await bcrypt.hash(password, 12),
      role: "OWNER",
    },
  });
  console.log(`Owner account: ${email}`);
}

// ─────────────── Sample data (only when the tables are empty) ───────────────

/** Builds a valid-looking (fictional) Portuguese NIPC from 8 digits. */
function nipc(base8: string): string {
  const d = base8.split("").map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (9 - i), 0);
  const check = 11 - (sum % 11);
  return base8 + String(check >= 10 ? 0 : check);
}

const SAMPLE_SUPPLIERS: {
  name: string;
  category: string;
  city: string;
  contact: string;
  rating: number;
  terms: number;
  lead: number;
  minOrder?: number;
  prices?: { item: string; history: [string, number][] }[];
}[] = [
  { name: "Têxteis Lusitânia, Lda.", category: "Peças lisas / têxteis", city: "Guimarães", contact: "Rui Fernandes", rating: 5, terms: 30, lead: 3, minOrder: 15000,
    prices: [
      { item: "T-shirt 150 g algodão (branca)", history: [["2026-06-01", 185], ["2026-09-01", 199]] },
      { item: "Hoodie 280 g (preto)", history: [["2026-06-01", 1090], ["2026-10-01", 1150]] },
    ] },
  { name: "Malhas do Ave, S.A.", category: "Peças lisas / têxteis", city: "Santo Tirso", contact: "Ana Martins", rating: 4, terms: 60, lead: 7, minOrder: 30000,
    prices: [{ item: "Polo piqué 210 g (azul marinho)", history: [["2026-07-15", 520]] }] },
  { name: "BonéPro Ibérica", category: "Peças lisas / têxteis", city: "Braga", contact: "Pedro Sousa", rating: 3, terms: 30, lead: 10,
    prices: [{ item: "Boné 5 painéis algodão", history: [["2026-05-01", 260], ["2026-08-20", 245]] }] },
  { name: "Inkjet Supplies Portugal", category: "Tintas e consumíveis", city: "Lisboa", contact: "Marta Lopes", rating: 4, terms: 30, lead: 2,
    prices: [{ item: "Tinta DTF CMYK+W 1 L", history: [["2026-04-01", 4200], ["2026-10-01", 4490]] }] },
  { name: "Sublima Tintas, Lda.", category: "Tintas e consumíveis", city: "Leiria", contact: "João Pires", rating: 4, terms: 15, lead: 3 },
  { name: "Vinil & Cia", category: "Transfers e vinil", city: "Porto", contact: "Sofia Costa", rating: 5, terms: 30, lead: 2,
    prices: [{ item: "Vinil textil PU (m)", history: [["2026-06-10", 690]] }] },
  { name: "DTF Express", category: "Transfers e vinil", city: "Aveiro", contact: "Tiago Ramos", rating: 4, terms: 0, lead: 1,
    prices: [{ item: "Filme DTF 60 cm (m)", history: [["2026-03-01", 210], ["2026-09-15", 230]] }] },
  { name: "EmbalaTudo", category: "Embalagem", city: "Maia", contact: "Carla Dias", rating: 3, terms: 30, lead: 5, minOrder: 5000,
    prices: [{ item: "Saco kraft com asa (un.)", history: [["2026-05-01", 18]] }] },
  { name: "Caixas do Norte", category: "Embalagem", city: "Valongo", contact: "Nuno Alves", rating: 4, terms: 30, lead: 4 },
  { name: "PrintMaq Serviços Técnicos", category: "Máquinas e manutenção", city: "Coimbra", contact: "Hugo Matos", rating: 4, terms: 30, lead: 2 },
  { name: "Bordados Tec", category: "Máquinas e manutenção", city: "Barcelos", contact: "Rita Gomes", rating: 5, terms: 30, lead: 5 },
  { name: "Transportes Rápidos Lusos", category: "Transportes", city: "Lisboa", contact: "Bruno Silva", rating: 4, terms: 30, lead: 1 },
  { name: "Envios Norte Express", category: "Transportes", city: "Porto", contact: "Inês Rocha", rating: 3, terms: 15, lead: 1 },
  { name: "Contas Certas – Contabilidade", category: "Serviços", city: "Braga", contact: "Paula Nunes", rating: 5, terms: 15, lead: 0 },
];

async function seedSuppliers() {
  if ((await prisma.supplier.count()) > 0) return;
  const categories = new Map((await prisma.supplierCategory.findMany()).map((c) => [c.name, c.id]));
  for (const [i, s] of SAMPLE_SUPPLIERS.entries()) {
    const slug = s.name.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 14);
    await prisma.supplier.create({
      data: {
        name: s.name,
        categoryId: categories.get(s.category)!,
        vatNumber: nipc(String(51234500 + i * 37)),
        contactName: s.contact,
        email: `encomendas@${slug}.example.pt`,
        phone: `+351 22${String(1000000 + i * 4321).slice(0, 7)}`,
        city: s.city,
        country: "PT",
        paymentTermsDays: s.terms,
        leadTimeDays: s.lead,
        minOrderNetCents: s.minOrder ?? null,
        rating: s.rating,
        active: i !== 4, // one inactive supplier to show the filter
        prices: s.prices && {
          create: s.prices.flatMap((p) =>
            p.history.map(([date, cents]) => ({ itemName: p.item, unitCostNetCents: cents, validFrom: new Date(date) })),
          ),
        },
      },
    });
  }
  console.log(`Sample suppliers: ${SAMPLE_SUPPLIERS.length}`);
}

type C = { type: "BLANK" | "PRINT" | "CONSUMABLES" | "PACKAGING" | "LABOUR" | "SHIPPING_IN" | "OTHER"; label: string; cost?: number; min?: number; technique?: "DTF" | "VINYL" | "SUBLIMATION" | "EMBROIDERY" | "SCREEN_PRINT" | "UV" | "LASER"; supplier?: string };

const SAMPLE_PRODUCTS: {
  name: string; sku: string; category: string; supplier?: string; price: number; vat?: number;
  costs: C[]; fixed?: [string, number][]; tiers?: [number, number | null, number][]; variants?: [string, string, string, number?][];
}[] = [
  { name: "T-shirt personalizada DTF", sku: "TS-DTF-150", category: "T-shirts", supplier: "Têxteis Lusitânia, Lda.", price: 1200,
    costs: [
      { type: "BLANK", label: "T-shirt 150 g algodão", cost: 199, supplier: "Têxteis Lusitânia, Lda." },
      { type: "PRINT", label: "Transfer DTF A4", cost: 145, technique: "DTF", supplier: "DTF Express" },
      { type: "CONSUMABLES", label: "Tinta e pó", cost: 25 },
      { type: "PACKAGING", label: "Saco individual", cost: 12, supplier: "EmbalaTudo" },
      { type: "LABOUR", label: "Prensagem e dobragem", min: 4 },
      { type: "SHIPPING_IN", label: "Quota portes", cost: 8 },
    ],
    tiers: [[1, 9, 1200], [10, 49, 950], [50, null, 790]],
    variants: [["TS-DTF-150-S", "S", "Branco"], ["TS-DTF-150-M", "M", "Branco"], ["TS-DTF-150-L", "L", "Branco"], ["TS-DTF-150-XXL", "XXL", "Branco", 40]] },
  { name: "Hoodie bordado peito", sku: "HD-BRD-280", category: "Sweats e hoodies", supplier: "Têxteis Lusitânia, Lda.", price: 3200,
    costs: [
      { type: "BLANK", label: "Hoodie 280 g", cost: 1150, supplier: "Têxteis Lusitânia, Lda." },
      { type: "PRINT", label: "Bordado logótipo 8 cm", cost: 280, technique: "EMBROIDERY" },
      { type: "CONSUMABLES", label: "Linha e entretela", cost: 35 },
      { type: "PACKAGING", label: "Saco + etiqueta", cost: 20 },
      { type: "LABOUR", label: "Bastidor e acabamento", min: 12 },
    ],
    fixed: [["Digitalização do bordado", 3500]],
    tiers: [[1, 9, 3200], [10, 49, 2750], [50, null, 2400]] },
  { name: "Polo farda bordado", sku: "PL-FARDA", category: "Fardas", supplier: "Malhas do Ave, S.A.", price: 1650,
    costs: [
      { type: "BLANK", label: "Polo piqué 210 g", cost: 520, supplier: "Malhas do Ave, S.A." },
      { type: "PRINT", label: "Bordado peito + manga", cost: 330, technique: "EMBROIDERY" },
      { type: "LABOUR", label: "Bordado e embalagem", min: 10 },
      { type: "PACKAGING", label: "Saco", cost: 12 },
    ],
    fixed: [["Digitalização do bordado", 3500]],
    tiers: [[10, 49, 1650], [50, 199, 1450], [200, null, 1290]] },
  { name: "Boné bordado frontal", sku: "BN-BRD", category: "Bonés", supplier: "BonéPro Ibérica", price: 950,
    costs: [
      { type: "BLANK", label: "Boné 5 painéis", cost: 245, supplier: "BonéPro Ibérica" },
      { type: "PRINT", label: "Bordado frontal", cost: 220, technique: "EMBROIDERY" },
      { type: "LABOUR", label: "Bastidor", min: 8 },
    ],
    tiers: [[1, 24, 950], [25, null, 780]] },
  { name: "Caneca sublimada 330 ml", sku: "CN-SUB-330", category: "Canecas", price: 790,
    costs: [
      { type: "BLANK", label: "Caneca branca AAA", cost: 165 },
      { type: "PRINT", label: "Papel e tinta sublimação", cost: 35, technique: "SUBLIMATION", supplier: "Sublima Tintas, Lda." },
      { type: "PACKAGING", label: "Caixa individual", cost: 45, supplier: "Caixas do Norte" },
      { type: "LABOUR", label: "Prensa de canecas", min: 6 },
    ],
    tiers: [[1, 11, 790], [12, 47, 650], [48, null, 540]] },
  { name: "Saco tote serigrafado", sku: "TB-SRG", category: "Sacos", price: 420,
    costs: [
      { type: "BLANK", label: "Tote algodão 140 g", cost: 105 },
      { type: "PRINT", label: "Serigrafia 1 cor", cost: 45, technique: "SCREEN_PRINT" },
      { type: "LABOUR", label: "Impressão e secagem", min: 2 },
    ],
    fixed: [["Quadro + fotolito", 4500]],
    tiers: [[50, 99, 420], [100, 499, 340], [500, null, 280]] },
  { name: "Crachá pin 38 mm", sku: "PN-38", category: "Crachás e pins", price: 120,
    costs: [
      { type: "BLANK", label: "Componentes pin 38 mm", cost: 9 },
      { type: "PRINT", label: "Impressão papel", cost: 3 },
      { type: "LABOUR", label: "Prensa", min: 1 },
    ],
    tiers: [[1, 49, 120], [50, 199, 85], [200, null, 60]] },
  { name: "T-shirt vinil nome + número", sku: "TS-VNL", category: "T-shirts", supplier: "Têxteis Lusitânia, Lda.", price: 1050,
    costs: [
      { type: "BLANK", label: "T-shirt técnica", cost: 290 },
      { type: "PRINT", label: "Vinil PU (nome + número)", cost: 160, technique: "VINYL", supplier: "Vinil & Cia" },
      { type: "LABOUR", label: "Corte, depilação e prensa", min: 9 },
      { type: "PACKAGING", label: "Saco", cost: 12 },
    ] },
  { name: "Sweat promocional DTF (campanha)", sku: "SW-PROMO", category: "Sweats e hoodies", supplier: "Têxteis Lusitânia, Lda.", price: 1490,
    costs: [
      { type: "BLANK", label: "Sweat 260 g", cost: 890 },
      { type: "PRINT", label: "Transfer DTF A3", cost: 260, technique: "DTF", supplier: "DTF Express" },
      { type: "LABOUR", label: "Prensagem", min: 5 },
      { type: "PACKAGING", label: "Saco", cost: 12 },
    ] },
  { name: "Garrafa térmica gravada laser", sku: "GR-LSR", category: "Merchandising", price: 1150,
    costs: [
      { type: "BLANK", label: "Garrafa inox 500 ml", cost: 690 },
      { type: "PRINT", label: "Gravação laser", cost: 60, technique: "LASER" },
      { type: "PACKAGING", label: "Caixa", cost: 45, supplier: "Caixas do Norte" },
      { type: "LABOUR", label: "Gravação e embalagem", min: 6 },
    ],
    tiers: [[1, 24, 1150], [25, null, 980]] },
];

async function seedProducts() {
  if ((await prisma.product.count()) > 0) return;
  const categories = new Map((await prisma.productCategory.findMany()).map((c) => [c.name, c.id]));
  const suppliers = new Map((await prisma.supplier.findMany()).map((s) => [s.name, s.id]));
  for (const p of SAMPLE_PRODUCTS) {
    await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        categoryId: categories.get(p.category)!,
        supplierId: p.supplier ? suppliers.get(p.supplier) : null,
        baseSalePriceNetCents: p.price,
        vatRateBp: p.vat ?? 2300,
        costItems: {
          create: p.costs.map((c, i) => ({
            type: c.type,
            label: c.label,
            technique: c.technique ?? null,
            supplierId: c.supplier ? suppliers.get(c.supplier) : null,
            unitCostNetCents: c.type === "LABOUR" ? null : (c.cost ?? 0),
            labourMinutes: c.type === "LABOUR" ? (c.min ?? 0) : null,
            sortOrder: i,
          })),
        },
        fixedCosts: { create: (p.fixed ?? []).map(([label, amountNetCents]) => ({ label, amountNetCents })) },
        priceTiers: { create: (p.tiers ?? []).map(([minQty, maxQty, unitPriceNetCents]) => ({ minQty, maxQty, unitPriceNetCents })) },
        variants: {
          create: (p.variants ?? []).map(([sku, size, colour, extra]) => ({ sku, size, colour, extraCostNetCents: extra ?? 0 })),
        },
      },
    });
  }
  console.log(`Sample products: ${SAMPLE_PRODUCTS.length}`);
}

// Deterministic pseudo-random so every seed run produces the same data.
function rng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const CUSTOMERS = [
  "Restaurante O Lagar",
  "Clube Desportivo Ribeirense",
  "TechNova, Lda.",
  "Escola de Surf Onda Azul",
  "Construções Matos & Filhos",
  "Ginásio Forma Viva",
];

function vat(net: number, bp: number) {
  const v = Math.round((net * bp) / 10000);
  return { netCents: net, vatRateBp: bp, vatCents: v, grossCents: net + v };
}

async function seedTransactions() {
  if ((await prisma.transaction.count()) > 0) return;
  const rand = rng(42);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, 1));
  const cat = async (type: "INCOME" | "EXPENSE", name: string) =>
    (await prisma.transactionCategory.findFirstOrThrow({ where: { type, name } })).id;
  const sup = async (name: string) => (await prisma.supplier.findFirstOrThrow({ where: { name } })).id;

  const customers = await Promise.all(CUSTOMERS.map((name) => prisma.customer.create({ data: { name } })));
  const products = await prisma.product.findMany({ include: { priceTiers: true } });

  const salesCats = {
    clothing: await cat("INCOME", "Vestuário"),
    mugs: await cat("INCOME", "Canecas e brindes"),
    uniforms: await cat("INCOME", "Fardas"),
  };
  const salesCategoryFor = (sku: string) =>
    sku.startsWith("PL") ? salesCats.uniforms : sku.startsWith("CN") || sku.startsWith("GR") || sku.startsWith("PN") || sku.startsWith("TB") ? salesCats.mugs : salesCats.clothing;

  const rows: Prisma.TransactionCreateManyInput[] = [];
  // ~2–4 sales per week
  for (let d = new Date(start); d <= today; d = new Date(d.getTime() + 86_400_000)) {
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6 || rand() > 0.55) continue;
    const p = products[Math.floor(rand() * products.length)];
    const tier = p.priceTiers.length ? p.priceTiers[Math.floor(rand() * p.priceTiers.length)] : null;
    const qty = tier ? tier.minQty + Math.floor(rand() * 15) : 1 + Math.floor(rand() * 20);
    const unit = tier?.unitPriceNetCents ?? p.baseSalePriceNetCents;
    const customer = customers[Math.floor(rand() * customers.length)];
    const ageDays = (today.getTime() - d.getTime()) / 86_400_000;
    const pending = ageDays < 30 && rand() < 0.35;
    const due = new Date(d.getTime() + 30 * 86_400_000);
    rows.push({
      type: "INCOME",
      date: new Date(d),
      ...vat(unit * qty, 2300),
      description: `${qty} × ${p.name}`,
      categoryId: salesCategoryFor(p.sku),
      customerId: customer.id,
      productId: p.id,
      paymentMethod: "BANK_TRANSFER",
      status: pending ? "PENDING" : "PAID",
      dueDate: due,
      paidAt: pending ? null : new Date(d),
      invoiceRef: `FT 2026/${100 + rows.length}`,
    });
  }

  // Material purchases every ~10 days
  const purchases: [string, string, string, number][] = [
    ["Têxteis Lusitânia, Lda.", "Peças lisas", "Encomenda t-shirts e hoodies", 42000],
    ["DTF Express", "Transfers e vinil", "Transfers DTF", 9500],
    ["Inkjet Supplies Portugal", "Tintas e consumíveis", "Tintas DTF", 13500],
    ["EmbalaTudo", "Embalagem", "Sacos e etiquetas", 4800],
    ["Vinil & Cia", "Transfers e vinil", "Rolos de vinil", 7600],
    ["BonéPro Ibérica", "Peças lisas", "Bonés lisos", 12500],
    ["Caixas do Norte", "Embalagem", "Caixas para canecas", 5200],
  ];
  let i = 0;
  for (let d = new Date(start.getTime() + 3 * 86_400_000); d <= today; d = new Date(d.getTime() + 9 * 86_400_000)) {
    const [supplierName, catName, desc, base] = purchases[i++ % purchases.length];
    const net = Math.round(base * (0.8 + rand() * 0.5));
    rows.push({
      type: "EXPENSE",
      date: new Date(d),
      ...vat(net, 2300),
      description: desc,
      categoryId: await cat("EXPENSE", catName),
      supplierId: await sup(supplierName),
      paymentMethod: "BANK_TRANSFER",
      status: "PAID",
      paidAt: new Date(d),
      invoiceRef: `FT A/${2000 + i}`,
    });
  }
  // One-off expenses
  const oneOffs: [number, string, string, number, number, string | null][] = [
    [20, "Marketing", "Anúncios Instagram", 15000, 2300, null],
    [45, "Transportes e envios", "Envios a clientes (mês)", 8600, 2300, "Envios Norte Express"],
    [75, "Transportes e envios", "Envios a clientes (mês)", 9100, 2300, "Transportes Rápidos Lusos"],
    [60, "Compra", "Prensa térmica 40x50", 89000, 2300, "PrintMaq Serviços Técnicos"],
    [30, "Manutenção", "Manutenção máquina de bordar", 18000, 2300, "Bordados Tec"],
    [15, "Impostos e taxas", "Pagamento por conta IRC", 45000, 0, null],
  ];
  for (const [daysAgo, catName, desc, net, bp, supplierName] of oneOffs) {
    const d = new Date(today.getTime() - daysAgo * 86_400_000);
    if (d < start) continue;
    const parent = catName === "Compra" || catName === "Manutenção";
    rows.push({
      type: "EXPENSE",
      date: d,
      ...vat(net, bp),
      description: desc,
      categoryId: parent
        ? (await prisma.transactionCategory.findFirstOrThrow({ where: { type: "EXPENSE", name: catName, parent: { name: "Equipamento" } } })).id
        : await cat("EXPENSE", catName),
      supplierId: supplierName ? await sup(supplierName) : null,
      paymentMethod: "CARD",
      status: "PAID",
      paidAt: d,
    });
  }
  // A supplier invoice still to pay, already overdue
  rows.push({
    type: "EXPENSE",
    date: new Date(today.getTime() - 40 * 86_400_000),
    dueDate: new Date(today.getTime() - 10 * 86_400_000),
    ...vat(31500, 2300),
    description: "Encomenda polos (fatura a 30 dias)",
    categoryId: await cat("EXPENSE", "Peças lisas"),
    supplierId: await sup("Malhas do Ave, S.A."),
    status: "PENDING",
    invoiceRef: "FT MA/7781",
  });
  await prisma.transaction.createMany({ data: rows });

  // Recurring expenses from the start of the period; entries are generated by the app on first load.
  const recurring: [string, string, number, number, "MONTHLY" | "QUARTERLY" | "YEARLY", string | null, number][] = [
    ["Renda do armazém", "Renda", 65000, 0, "MONTHLY", null, 1],
    ["Adobe Creative Cloud", "Software e subscrições", 6149, 2300, "MONTHLY", null, 5],
    ["Avença contabilidade", "Contabilidade", 12000, 2300, "MONTHLY", "Contas Certas – Contabilidade", 10],
    ["Seguro multirriscos", "Outras despesas", 18000, 0, "QUARTERLY", null, 15],
    ["Alojamento site e email", "Software e subscrições", 1500, 2300, "MONTHLY", null, 20],
  ];
  for (const [description, catName, netCents, vatRateBp, frequency, supplierName, day] of recurring) {
    const startDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), day));
    await prisma.recurringExpense.create({
      data: {
        description,
        netCents,
        vatRateBp,
        frequency,
        categoryId: await cat("EXPENSE", catName),
        supplierId: supplierName ? await sup(supplierName) : null,
        paymentMethod: "BANK_TRANSFER",
        startDate,
        nextRunDate: startDate,
      },
    });
  }
  console.log(`Sample transactions: ${rows.length} (+ recurring expenses generated on first load)`);
}

async function main() {
  await seedReferenceData();
  await seedOwner();
  await seedSuppliers();
  await seedProducts();
  await seedTransactions();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

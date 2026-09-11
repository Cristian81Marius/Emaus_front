// "Baza de date" mock pentru Box of Blessing — la fel ca src/api/mock/data.ts
// (Emaus), în memorie, se resetează la fiecare repornire a serverului de dev, CU O
// EXCEPȚIE: istoricul de cumpărături (`bobPurchaseHistory.ts`) e persistat separat,
// cu AsyncStorage, la cererea explicită a utilizatorului ("să se salveze în DB").
//
// Beneficiarii de mai jos vin dintr-un tabel real trimis de utilizator (2026-09) —
// numerele de telefon au fost ușor alterate (ultimele 2 cifre), la cererea explicită
// a utilizatorului, înainte să intre în cod. `status` reflectă secțiunile din tabelul
// original ("Foști beneficiari" / "Posibili beneficiari" erau rânduri de separare, nu
// coloane — transformate aici în valoarea `status` a fiecărui rând de dedesubt).
import { BobBeneficiaryDto, BoxCategoryDto } from "../bobTypes";
import { MenuConfigDto } from "../types";

let seq = 0;
export function nextBobId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export const bobBeneficiaries: BobBeneficiaryDto[] = [
  { id: "bobben-1", fullName: "Vintilă Alexandra", phone: "0771.699.441", mobility: "Deplasabil", address: "Str. Valea Ialomiței 6, Bl C10, Sc C, Et 10, Ap 192", assignedVolunteerName: "Sami", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-2", fullName: "Szatmari Sanda", phone: "0771.472.907", mobility: "Nedeplasabil", address: "Moinești, Bl 127, Sc 2, Et 3, Ap 56", assignedVolunteerName: "Sami", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-3", fullName: "Pleșca Adela Nicoleta", phone: "0762.421.721", mobility: "Deplasabil", address: "Str. Fabricii nr 2B-A, Bl 15D, Sc A, Et 6, Ap 32", assignedVolunteerName: "Cristi", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-4", fullName: "Iliescu Gheorghe", phone: "0770 778 981", mobility: "Deplasabil", address: "Str. Ernest Juvara 31-33, Bl 1, Et 2, Ap 3", assignedVolunteerName: "Cristi", status: "Active", contacted: false, delivered: false, notes: "0314308981 - fix" },
  { id: "bobben-5", fullName: "Neacșu Marioara", phone: "0769.171.653", mobility: "Nedeplasabil", address: "Strada Straja 12, Bl.52, Sc.2, Et 7, Ap 108", assignedVolunteerName: "Sami", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-6", fullName: "Marin Alexe", phone: null, mobility: "Deplasabil", address: "Strada Sergent Turturică 81", assignedVolunteerName: "George", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-7", fullName: "Coporan Florian", phone: "0760197138", mobility: "Deplasabil", address: "Biserica Tuturor Sfinților Români", assignedVolunteerName: "George", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-8", fullName: "Fam. cu copii - Ligia", phone: null, mobility: null, address: null, assignedVolunteerName: "Ligia", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-9", fullName: "Laurențiu Ierusalim", phone: "0725157241", mobility: null, address: null, assignedVolunteerName: "Sami", status: "Active", contacted: false, delivered: false, notes: null },
  { id: "bobben-10", fullName: "Ștefănescu Rădița", phone: "0770.256.557", mobility: "Deplasabil", address: "Str. Rusetu 6, Bl G13, Sc 1, Et 1, Ap 6", assignedVolunteerName: "Sami", status: "Active", contacted: false, delivered: false, notes: null },

  { id: "bobben-11", fullName: "Mihăilă Smaranda", phone: "021.745.33.11", mobility: "Nedeplasabil", address: "Str. Latea Gheorghe 16, Bl C36, Et 5, Ap 64", assignedVolunteerName: null, status: "Former", contacted: false, delivered: false, notes: null },
  { id: "bobben-12", fullName: "Chiran Gheorghița", phone: "0727.588.971", mobility: "Deplasabil", address: "Str Partiturii 8, Bl 62, Sc 1, Et 4, Ap 20", assignedVolunteerName: null, status: "Former", contacted: false, delivered: false, notes: null },
  { id: "bobben-13", fullName: "Stoica Aurica", phone: "0736.129.761", mobility: "Nedeplasabil", address: "Drumul Cioroglarlei 147A", assignedVolunteerName: null, status: "Former", contacted: false, delivered: false, notes: "pachet pentru cămin" },
  { id: "bobben-14", fullName: "Ionescu Lucrețiu", phone: "0733.433.427", mobility: "Deplasabil", address: "Bd. 1 Mai nr. 26, Bl. 6S14, Sc. 1, Et 5, Ap. 62", assignedVolunteerName: null, status: "Former", contacted: false, delivered: false, notes: null },
  { id: "bobben-15", fullName: "Anghelina Costinel", phone: "0726.901.119", mobility: "Deplasabil", address: "Str. Topazului, Bragadiru", assignedVolunteerName: null, status: "Former", contacted: false, delivered: false, notes: null },

  { id: "bobben-16", fullName: "Simionescu Catinca", phone: "021.772.60.11", mobility: null, address: "Str. Răsăritului nr. 2, Bl. M9, Sc.1, Et. 5, Ap. 34", assignedVolunteerName: null, status: "Possible", contacted: false, delivered: false, notes: null },
  { id: "bobben-17", fullName: "Kurt Ștefania", phone: "0764542668", mobility: null, address: "Intrarea Drumul la Roșu nr. 8", assignedVolunteerName: null, status: "Possible", contacted: false, delivered: false, notes: null },
];

/** Conținutul cutiei — catalog pe categorii, cu bifa "face parte din cutia curentă"
 * (runda în lucru, nu istoric). Prețurile + bifele inițiale vin exact din excel-ul
 * trimis de utilizator. */
export const bobBoxCatalog: BoxCategoryDto[] = [
  {
    key: "bacanie",
    title: "Băcănie",
    items: [
      { id: "box-1", name: "Făină", price: 1.69, checked: true },
      { id: "box-2", name: "Zahăr", price: 3.79, checked: true },
      { id: "box-3", name: "Sare", price: 2.75, checked: false },
      { id: "box-4", name: "Ulei", price: 7.59, checked: true },
      { id: "box-5", name: "Oțet", price: 3.49, checked: false },
      { id: "box-6", name: "Mălai", price: 1.99, checked: true },
      { id: "box-7", name: "Orez", price: 5.89, checked: false },
      { id: "box-8", name: "Fasole", price: 3.5, checked: false },
      { id: "box-9", name: "Griș", price: 3.19, checked: false },
    ],
  },
  {
    key: "conserve-nepreparate",
    title: "Conserve nepreparate",
    items: [
      { id: "box-10", name: "Suc de roșii / Bulion", price: 5.49, checked: true },
      { id: "box-11", name: "Mazăre", price: 4, checked: false },
      { id: "box-12", name: "Fasole roșie", price: 3.45, checked: false },
      { id: "box-13", name: "Fasole albă", price: 3.49, checked: true },
      { id: "box-14", name: "Linte", price: 3.79, checked: false },
      { id: "box-15", name: "Năut", price: 2.99, checked: false },
      { id: "box-16", name: "Ciuperci", price: 5.99, checked: true },
      { id: "box-17", name: "Porumb", price: 4.99, checked: false },
      { id: "box-18", name: "Măsline", price: 3.89, checked: false },
      { id: "box-19", name: "Castraveți murați", price: 5.59, checked: false },
      { id: "box-20", name: "Varză murată", price: 5.3, checked: true },
      { id: "box-21", name: "Sfeclă roșie", price: 7.59, checked: false },
      { id: "box-22", name: "Fasole păstăi", price: 5.99, checked: false },
      { id: "box-23", name: "Roșii pastă", price: 3.55, checked: false },
      { id: "box-24", name: "Porumb (cutie mică)", price: 3.05, checked: false },
      { id: "box-25", name: "Mix de legume", price: 8.49, checked: true },
    ],
  },
  {
    key: "conserve-preparate",
    title: "Conserve preparate",
    items: [
      { id: "box-26", name: "Hering în suc de roșii", price: 6.09, checked: true },
      { id: "box-27", name: "Hering în ulei", price: 4.95, checked: false },
      { id: "box-28", name: "Sardine", price: 4.49, checked: false },
      { id: "box-29", name: "Ton mărunțit", price: 4.95, checked: true },
      { id: "box-30", name: "Pate vegetal (mic)", price: 2.2, checked: false },
      { id: "box-31", name: "Tocană", price: 3.49, checked: true },
      { id: "box-32", name: "Zacuscă", price: 3.99, checked: false },
      { id: "box-33", name: "Pate", price: 6.99, checked: true },
      { id: "box-34", name: "Fasole cu cârnăciori", price: 2.99, checked: false },
      { id: "box-35", name: "Chiftelțe marinate", price: 11.19, checked: true },
      { id: "box-36", name: "Ciorbă fasole afumătură", price: 9.99, checked: true },
      { id: "box-37", name: "Iahnie de fasole", price: 7.29, checked: false },
      { id: "box-38", name: "Pate vegetal", price: 3.99, checked: false },
      { id: "box-39", name: "Pastă de măsline", price: 4.99, checked: false },
    ],
  },
  {
    key: "fainoase",
    title: "Făinoase",
    items: [
      { id: "box-40", name: "Supă plic", price: 3.39, checked: false },
      { id: "box-41", name: "Fidea", price: 2.49, checked: false },
      { id: "box-42", name: "Spaghetti", price: 2.39, checked: false },
      { id: "box-43", name: "Tăiței", price: 2.59, checked: true },
      { id: "box-44", name: "Penne", price: 3.79, checked: true },
      { id: "box-45", name: "Melcișori", price: 4.89, checked: false },
    ],
  },
  {
    key: "dulciuri",
    title: "Dulciuri",
    items: [
      { id: "box-46", name: "Covrigi", price: 5.19, checked: true },
      { id: "box-47", name: "Corn", price: 4, checked: false },
      { id: "box-48", name: "Grisine", price: 3.49, checked: false },
      { id: "box-49", name: "Biscuiți sărați", price: 3.99, checked: false },
      { id: "box-50", name: "Biscuiți dulci", price: 1.19, checked: true },
      { id: "box-51", name: "Croissant", price: 1.69, checked: false },
      { id: "box-52", name: "Napolitane", price: 4.5, checked: false },
      { id: "box-53", name: "Bomboane", price: 8.99, checked: false },
      { id: "box-54", name: "Cozonac / Chec", price: 13.99, checked: false },
      { id: "box-55", name: "Ciocolată", price: 4.95, checked: false },
      { id: "box-56", name: "Prăjiturică", price: 1.39, checked: false },
      { id: "box-57", name: "Compot piersici", price: 7.99, checked: false },
      { id: "box-58", name: "Stafide", price: 5.99, checked: false },
    ],
  },
  {
    key: "condimente",
    title: "Condimente",
    items: [
      { id: "box-59", name: "Cafea", price: 3.89, checked: false },
      { id: "box-60", name: "Ceai", price: 4.19, checked: false },
      { id: "box-61", name: "Piper", price: 5.99, checked: false },
      { id: "box-62", name: "Boia", price: 3.95, checked: false },
      { id: "box-63", name: "Busuioc", price: 3.95, checked: false },
      { id: "box-64", name: "Cacao", price: 5.39, checked: false },
    ],
  },
  {
    key: "igiena",
    title: "Igienă & curățenie",
    items: [
      { id: "box-65", name: "Săpun", price: 5.99, checked: false },
      { id: "box-66", name: "Pastă de dinți", price: 2.39, checked: false },
      { id: "box-67", name: "Gel de duș", price: 4.79, checked: false },
      { id: "box-68", name: "Șervețele", price: 1, checked: false },
      { id: "box-69", name: "Detergent de vase", price: 5.05, checked: false },
      { id: "box-70", name: "Domestos", price: 11.5, checked: false },
      { id: "box-71", name: "Spirt", price: 5.2, checked: false },
    ],
  },
  {
    key: "diverse",
    title: "Diverse & perisabile",
    items: [
      { id: "box-72", name: "Suncă pui", price: 8, checked: false },
      { id: "box-73", name: "Mezel", price: 12, checked: false },
      { id: "box-74", name: "Lapte UHT", price: 4.75, checked: false },
      { id: "box-75", name: "Brânză topită", price: 5.29, checked: false },
      { id: "box-76", name: "Drojdie", price: 3.57, checked: false },
    ],
  },
];

// Buget maxim per cutie — preluat din "Conținutul Cutiei: 99.28" din excel-ul
// trimis, folosit ca reper (nu recalculat din bifele curente — bugetul MAXIM
// rămâne fix, indiferent ce se bifează/debifează pe moment).
export const bobConfig = {
  maxBudgetPerBox: 99.28,
};


// Cele 4 taburi BOB acoperă tot ce are proiectul (dashboard/beneficiari/cumpărături/
// istoric) — spre deosebire de Emaus, unde secțiuni secundare (Beneficiari,
// Mentenanță...) stau în `moreSections`, aici rămâne gol, n-are ce.
export const bobMenuConfig: MenuConfigDto = {
  tabs: [
    { key: "bob-dashboard", label: "Dashboard", href: "/bob", icon: "📦" },
    { key: "bob-beneficiaries", label: "Beneficiari", href: "/bob/beneficiaries", icon: "🧑‍🤝‍🧑" },
    { key: "bob-shopping", label: "Cumpărături", href: "/bob/shopping", icon: "🛒" },
    { key: "menu", label: "Meniu", href: "/menu", icon: "•••" },
  ],
  moreSections: [
    {
      title: "Box of Blessing",
      items: [{ key: "bob-history", label: "Istoric cumpărături", href: "/bob/history", icon: "🧾" }],
    },
  ],
};

export const bobDb = { beneficiaries: bobBeneficiaries, boxCatalog: bobBoxCatalog };

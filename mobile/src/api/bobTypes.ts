// DTO-uri pentru "Box of Blessing" (BOB) — al doilea proiect din aplicație, complet
// separat de Emaus (vezi src/api/types.ts pentru cazări). Fără corespondent în
// backend-ul C# — trăiește doar în mock (src/api/mock/bobData.ts + bobServer.ts),
// exact ca restul rutelor "inventate" (stats/overview, menu) din proiectul Emaus.

export type BobBeneficiaryStatus = "Active" | "Former" | "Possible";
export type BobMobility = "Deplasabil" | "Nedeplasabil";

export interface BobBeneficiaryDto {
  id: string;
  fullName: string;
  phone: string | null;
  mobility: BobMobility | null;
  address: string | null;
  assignedVolunteerName: string | null;
  status: BobBeneficiaryStatus;
  /** Bifele "Am vorbit" / "Livrat" din evidența cu cutiile — resetate manual la
   * începutul fiecărei runde de livrare (nu automat, ca să rămână vizibil cine a
   * apucat să confirme înainte de reset). */
  contacted: boolean;
  delivered: boolean;
  notes: string | null;
}

export interface BoxItemDto {
  id: string;
  name: string;
  price: number;
  /** Bifat = face parte din cutia curentă (runda în lucru), nu un istoric — vezi
   * `BobDeliveryRecordDto` pentru instantaneul salvat la "Cumpărături efectuate". */
  checked: boolean;
}

export interface BoxCategoryDto {
  key: string;
  title: string;
  items: BoxItemDto[];
}

export interface BobDeliveryRecordDto {
  id: string;
  /** Data la care s-au făcut cumpărăturile ("AAAA-LL-ZZ"). */
  date: string;
  items: { name: string; price: number }[];
  total: number;
  note: string | null;
}

// Responsabilii posibili — momentan o listă fixă, mock (cerută explicit așa de
// utilizator), nu preluată din `db.users` (Emaus): "George" nu are cont Emaus, iar
// legarea de conturi reale ar cere o decizie separată despre cine poate fi responsabil.
// Trăiește aici (nu în mock/bobData.ts) — e o constantă de UI, nu date de server;
// ecranele nu importă niciodată direct din mock/, doar din api.*.
export const BOB_VOLUNTEER_OPTIONS: { value: string; label: string }[] = [
  { value: "Cristi", label: "Cristi" },
  { value: "Sami", label: "Sami" },
  { value: "George", label: "George" },
  { value: "Ștefan", label: "Ștefan" },
];

export interface BobStatsDto {
  /** Beneficiari activi (`status: "Active"`) — cei "Foști"/"Posibili" nu intră aici. */
  beneficiariesCount: number;
  maxBudgetPerBox: number;
  /** Zile până la sfârșitul lunii curente — livrarea are loc la final de lună. */
  daysUntilNextDelivery: number;
  lastDeliveryDate: string | null;
  /** Suma curentă a cutiei în lucru — articolele bifate acum în `/bob/shopping`. */
  currentBoxTotal: number;
  volunteersInvolved: number;
}

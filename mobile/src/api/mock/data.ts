// "Baza de date" mock — trăiește doar în memorie, cât rulează aplicația (se
// resetează la fiecare repornire a serverului de dev). Scopul: să putem umbla prin
// toate ecranele și fluxurile fără backend-ul real pornit, ca să ne concentrăm pe
// cum arată și se simte aplicația. Vezi mobile/CLAUDE.md pentru cum se editează
// datele de-aici sau cum se dezactivează mock-ul când ne reconectăm la backend.
//
// Datele de mai jos sunt preluate din evidența reală trimisă de utilizator (locații,
// ocupanți curenți, cereri în așteptare, rotația de curățenie, chei) — nu sunt
// inventate. Câteva note despre cum au fost interpretate:
// - Totalurile "lifetime" per locație (zile de cazare / cazări încheiate) sunt exact
//   cele din evidență — suma lor pe toate locațiile dă precis 4705 zile / 309 cazări,
//   ceea ce confirmă că acelea sunt corecte; nu re-introducem însă fiecare cazare
//   istorică rând-cu-rând (ar fi sute), doar totalul raportat, pe fiecare locație.
// - Rezumatul din capul foii ("6 locații - 8 camere - 6 camere ocupate") era ușor
//   desincronizat față de detaliul pe locații (probabil o celulă neactualizată) —
//   numărul de locații/unități/ocupate din `GET /api/stats/overview` se calculează
//   live din `properties`, nu se preia acel rezumat static.
import {
  BeneficiaryDto,
  BookingCommentDto,
  CleaningAssignmentDto,
  CleaningTaskDto,
  MaintenanceTicketDto,
  MenuConfigDto,
  NotificationType,
  OpportunityType,
  PropertyDto,
  UserDto,
  UserStatus,
} from "../types";

export interface MockUser extends UserDto {
  password: string;
  // [NOU] — conturile din seed sunt toate `Active` (deja aprobate); un cont
  // auto-înregistrat (POST /api/auth/register) pornește `PendingApproval`.
  status: UserStatus;
  // [NOU] opțional — doar conturile auto-înregistrate îl completează (cu `nowIso()`,
  // la înregistrare); conturile din seed n-au nevoie de el, nu apar niciodată ca
  // "cerere în așteptare" (toate pornesc `Active`).
  createdAt?: string;
}

export interface MockBooking {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  unitId: string | null;
  unitName: string | null;
  propertyAddress: string | null;
  requestedCheckIn: string;
  requestedCheckOut: string;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  status: "PendingApproval" | "Approved" | "Rejected" | "Active" | "Completed" | "Cancelled";
  createdByName: string;
  createdByUserId: string;
  createdAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  caseManagerUserId: string | null;
  caseManagerName: string | null;
  comments: BookingCommentDto[];
}

export interface MockOpportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  hasTime: boolean;
  propertyId: string | null;
  propertyAddress: string | null;
  capacity: number | null;
  signedUpUserIds: string[];
}

export interface MockNotification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

// --- Date relative la azi, pentru intrările sintetice (notificări, oportunități) —
// intrările reale de mai jos folosesc datele calendaristice exacte din evidență. ------
const SEED_NOW = new Date();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateOffset(days: number): string {
  const d = new Date(SEED_NOW);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function dateTimeOffset(days: number, hour: number, minute: number): string {
  const d = new Date(SEED_NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isoOffset(days: number): string {
  const d = new Date(SEED_NOW);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function todayIso(): string {
  return toDateStr(new Date());
}

export function nowIso(): string {
  return new Date().toISOString();
}

let idCounter = 1000;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// --- Utilizatori (nume reale din rotația de curățenie/chei) ----------------------
// Parola pentru toate conturile de test: Emaus2026! (vezi hint-ul din login.tsx).
// Alexandra apare peste tot ca responsabil de chei și cu prezență "nelimitată" în
// evidență — singurul cont Nucleus. Restul sunt voluntari.
export const users: MockUser[] = [
  { id: "user-alexandra", fullName: "Alexandra", phone: "0700000000", email: "alexandra@emaus.ro", role: "Nucleus", password: "Emaus2026!", status: "Active" },
  { id: "user-david", fullName: "David", phone: "0711111111", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-alina", fullName: "Alina", phone: "0722010203", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-ligia", fullName: "Ligia", phone: "0722020304", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-ioana", fullName: "Ioana", phone: "0722030405", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-stefan", fullName: "Ștefan", phone: "0722040506", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-dominic", fullName: "Dominic", phone: "0722050607", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-ema", fullName: "Ema", phone: "0722060708", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-sami", fullName: "Sami", phone: "0722070809", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-cristi", fullName: "Cristi", phone: "0722080910", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-rebeca", fullName: "Rebeca", phone: "0722091011", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-elena", fullName: "Elena", phone: "0722101112", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-miriam", fullName: "Miriam", phone: "0722111213", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-florentina", fullName: "Florentina", phone: "0722121314", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
  { id: "user-diandra", fullName: "Diandra", phone: "0722131415", email: null, role: "Volunteer", password: "Emaus2026!", status: "Active" },
];

// --- Locații & unități (adrese reale) ---------------------------------------------
export const properties: PropertyDto[] = [
  {
    id: "prop-laborator-124",
    address: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124",
    shortLabel: "Str. Laborator nr. 124, ap. 124",
    isTemporary: false,
    notes: null,
    interfon: null,
    keyHolders: ["Alexandra", "David"],
    keyNotes: "1 cheie - la beneficiari",
    lifetimeStayDays: 997,
    lifetimeBookingsCompleted: 58,
    units: [{ id: "unit-laborator-124", propertyId: "prop-laborator-124", name: "Ap. 124", capacity: 3, status: "Available", statusNotes: null }],
  },
  {
    id: "prop-laborator-94",
    address: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 8, ap. 94",
    shortLabel: "Str. Laborator nr. 124, ap. 94",
    isTemporary: false,
    notes: null,
    interfon: null,
    keyHolders: ["Alexandra", "Ștefan", "Ligia", "Diandra"],
    keyNotes: "1 cheie - la beneficiari",
    lifetimeStayDays: 789,
    lifetimeBookingsCompleted: 52,
    units: [{ id: "unit-laborator-94", propertyId: "prop-laborator-94", name: "Ap. 94", capacity: 3, status: "Available", statusNotes: null }],
  },
  {
    id: "prop-dristorului-893",
    address: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893",
    shortLabel: "Str. Dristorului nr. 97-119, ap. 893",
    isTemporary: false,
    notes: "Interfon: 9316 c, SC 3 stânga.",
    interfon: "9316 c (SC 3 stânga)",
    keyHolders: ["Alexandra", "Ștefan", "Ligia"],
    keyNotes: "1 cheie la beneficiari",
    lifetimeStayDays: 742,
    lifetimeBookingsCompleted: 32,
    units: [{ id: "unit-dristorului-893", propertyId: "prop-dristorului-893", name: "Ap. 893", capacity: 3, status: "Occupied", statusNotes: null }],
  },
  {
    id: "prop-dristorului-parter",
    address: "Str. Dristorului, nr. 97-119 — Parter",
    shortLabel: "Str. Dristorului nr. 97-119, parter",
    isTemporary: false,
    notes: null,
    interfon: null,
    keyHolders: [],
    keyNotes: null,
    lifetimeStayDays: null,
    lifetimeBookingsCompleted: null,
    units: [{ id: "unit-dristorului-parter", propertyId: "prop-dristorului-parter", name: "Parter", capacity: 2, status: "Available", statusNotes: null }],
  },
  {
    id: "prop-vlad-judetul",
    address: "Str. Vlad Județul, nr. 4, bl. V13, sc. 1, et. 3, ap. 37",
    shortLabel: "Str. Vlad Județul nr. 4, ap. 37",
    isTemporary: false,
    notes: null,
    interfon: null,
    keyHolders: ["Alexandra", "Ștefan"],
    keyNotes: "1 cheie la beneficiari",
    lifetimeStayDays: 568,
    lifetimeBookingsCompleted: 29,
    units: [{ id: "unit-vlad-judetul", propertyId: "prop-vlad-judetul", name: "Ap. 37", capacity: 2, status: "Occupied", statusNotes: null }],
  },
  {
    id: "prop-traian-popovici",
    address: "Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28",
    shortLabel: "Str. Traian Popovici nr. 132, ap. 28",
    isTemporary: false,
    notes: "Interfon 528.",
    interfon: "528",
    keyHolders: ["Alexandra", "Cristi"],
    keyNotes: "2 chei la beneficiari",
    lifetimeStayDays: 523,
    lifetimeBookingsCompleted: 51,
    units: [
      { id: "unit-traian-sufragerie", propertyId: "prop-traian-popovici", name: "Sufragerie", capacity: 3, status: "Occupied", statusNotes: null },
      { id: "unit-traian-dormitor", propertyId: "prop-traian-popovici", name: "Dormitor", capacity: 2, status: "Occupied", statusNotes: null },
    ],
  },
  {
    id: "prop-stanescu-gheorghe",
    address: "Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6",
    shortLabel: "Str. Stănescu Gheorghe nr. 1, ap. 6",
    isTemporary: false,
    notes: null,
    interfon: null,
    keyHolders: ["Alexandra", "Miriam"],
    keyNotes: "2 chei la beneficiari",
    lifetimeStayDays: 191,
    lifetimeBookingsCompleted: 25,
    units: [
      { id: "unit-stanescu-sufragerie", propertyId: "prop-stanescu-gheorghe", name: "Sufragerie", capacity: 3, status: "Occupied", statusNotes: null },
      { id: "unit-stanescu-dormitor", propertyId: "prop-stanescu-gheorghe", name: "Dormitor", capacity: 2, status: "Occupied", statusNotes: null },
    ],
  },
  {
    id: "prop-elev-stefanescu",
    address: "Str. Elev Ștefan Ștefănescu, nr. 9, bl. 449, sc. A, et. 2, ap. 32",
    shortLabel: "Str. Elev Ștefan Ștefănescu nr. 9, ap. 32",
    isTemporary: false,
    notes: null,
    interfon: null,
    keyHolders: [],
    keyNotes: null,
    lifetimeStayDays: 801,
    lifetimeBookingsCompleted: 37,
    units: [{ id: "unit-elev-stefanescu", propertyId: "prop-elev-stefanescu", name: "Ap. 32", capacity: 3, status: "Available", statusNotes: null }],
  },
  {
    id: "prop-airbnb-temporar",
    address: "Locații AirBnB / temporare",
    shortLabel: "Locații temporare",
    isTemporary: true,
    notes: "Cazări scurte, ad-hoc, în afara celor 7 locații fixe — rezervate punctual când e nevoie.",
    interfon: null,
    keyHolders: [],
    keyNotes: null,
    lifetimeStayDays: 94,
    lifetimeBookingsCompleted: 25,
    units: [{ id: "unit-airbnb", propertyId: "prop-airbnb-temporar", name: "Locație temporară", capacity: 2, status: "Available", statusNotes: null }],
  },
];

// --- Beneficiari (nume reale din evidență) ----------------------------------------
export const beneficiaries: BeneficiaryDto[] = [
  { id: "ben-cotulbea", fullName: "Cotulbea Marian", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-serban", fullName: "Șerban Emilia", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-nutu", fullName: "Nuțu Dumitru", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-cianca", fullName: "Cianca Mihalache", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-micu", fullName: "Micu Ramona", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-tirsoreanu", fullName: "Tirsoreanu Matilda", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-daniela", fullName: "Daniela Adina", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-mama-copil", fullName: "Mama și copil", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-bulandra", fullName: "Fam. Bulandra", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-hospice", fullName: "Beneficiar hospice", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: "Pacient în îngrijire paliativă." },
  { id: "ben-olariu", fullName: "Olariu", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Blocked", blockedReason: "Motiv nespecificat în evidența preluată.", accountBalance: 0, notes: null },
  { id: "ben-jinga", fullName: "Jingă Florina", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-barculescu", fullName: "Bărculescu Claudia", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-duroi", fullName: "Fam. Duroi", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: "Mehedinți", status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-andrei-mihai", fullName: "Andrei Mihai", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-silochi", fullName: "Silochi Viorica", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-ovcearenco", fullName: "Ovcearenco Victor", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-mazilu", fullName: "Mazilu Florin", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-ivan-erik", fullName: "Ivan Erik", phone: "0766884441", localityId: null, localityName: null, localityFreeText: "Constanța", address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-chesa", fullName: "Chesa Dumitru", phone: "0726852804", localityId: null, localityName: null, localityFreeText: "Constanța", address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
  { id: "ben-enache", fullName: "Fam. Enache", phone: null, localityId: null, localityName: null, localityFreeText: null, address: null, idCardSeries: null, idCardNumber: null, supportPersonName: null, supportPersonPhone: null, age: null, materialSituation: null, referralSource: null, status: "Active", blockedReason: null, accountBalance: 0, notes: null },
];

const bookingComment: BookingCommentDto = {
  id: nextId("comment"),
  authorUserId: "user-ligia",
  authorName: "Ligia",
  text: "Cotulbea Marian s-a instalat, totul e în regulă.",
  createdAt: "2026-08-31T18:00:00.000Z",
};

// --- Solicitări & cazări (calendarul real: 6 active, 2 în așteptare, 2 aprobate,
// 1 respinsă — beneficiar blocat, 1 anulată, + un eșantion din istoricul de cazări) ---
export const bookings: MockBooking[] = [
  // Active — ocupanții curenți
  { id: "book-cotulbea", beneficiaryId: "ben-cotulbea", beneficiaryName: "Cotulbea Marian", unitId: "unit-dristorului-893", unitName: "Ap. 893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", requestedCheckIn: "2026-08-31", requestedCheckOut: "2026-10-09", actualCheckIn: "2026-08-31", actualCheckOut: null, status: "Active", createdByName: "Ștefan", createdByUserId: "user-stefan", createdAt: "2026-08-30T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-08-30T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [bookingComment] },
  { id: "book-serban", beneficiaryId: "ben-serban", beneficiaryName: "Șerban Emilia", unitId: "unit-vlad-judetul", unitName: "Ap. 37", propertyAddress: "Str. Vlad Județul, nr. 4, bl. V13, sc. 1, et. 3, ap. 37", requestedCheckIn: "2026-07-02", requestedCheckOut: "2026-09-30", actualCheckIn: "2026-07-02", actualCheckOut: null, status: "Active", createdByName: "Alexandra", createdByUserId: "user-alexandra", createdAt: "2026-07-01T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-07-01T11:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-nutu", beneficiaryId: "ben-nutu", beneficiaryName: "Nuțu Dumitru", unitId: "unit-traian-sufragerie", unitName: "Sufragerie", propertyAddress: "Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28", requestedCheckIn: "2026-08-10", requestedCheckOut: "2026-10-10", actualCheckIn: "2026-08-10", actualCheckOut: null, status: "Active", createdByName: "Cristi", createdByUserId: "user-cristi", createdAt: "2026-08-09T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-08-09T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-cianca", beneficiaryId: "ben-cianca", beneficiaryName: "Cianca Mihalache", unitId: "unit-traian-dormitor", unitName: "Dormitor", propertyAddress: "Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28", requestedCheckIn: "2026-08-17", requestedCheckOut: "2026-10-09", actualCheckIn: "2026-08-17", actualCheckOut: null, status: "Active", createdByName: "Cristi", createdByUserId: "user-cristi", createdAt: "2026-08-16T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-08-16T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-micu", beneficiaryId: "ben-micu", beneficiaryName: "Micu Ramona", unitId: "unit-stanescu-sufragerie", unitName: "Sufragerie", propertyAddress: "Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6", requestedCheckIn: "2026-08-31", requestedCheckOut: "2026-09-18", actualCheckIn: "2026-08-31", actualCheckOut: null, status: "Active", createdByName: "Miriam", createdByUserId: "user-miriam", createdAt: "2026-08-30T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-08-30T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-tirsoreanu-1", beneficiaryId: "ben-tirsoreanu", beneficiaryName: "Tirsoreanu Matilda", unitId: "unit-stanescu-dormitor", unitName: "Dormitor", propertyAddress: "Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6", requestedCheckIn: "2026-09-09", requestedCheckOut: "2026-09-11", actualCheckIn: "2026-09-09", actualCheckOut: null, status: "Active", createdByName: "Miriam", createdByUserId: "user-miriam", createdAt: "2026-09-08T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-09-08T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },

  // În așteptare (lista reală "În așteptare" de la Ap. 94)
  { id: "book-daniela", beneficiaryId: "ben-daniela", beneficiaryName: "Daniela Adina", unitId: null, unitName: null, propertyAddress: null, requestedCheckIn: "2026-09-15", requestedCheckOut: "2026-10-13", actualCheckIn: null, actualCheckOut: null, status: "PendingApproval", createdByName: "Ligia", createdByUserId: "user-ligia", createdAt: "2026-09-09T09:00:00.000Z", decidedByName: null, decidedAt: null, decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-mama-copil", beneficiaryId: "ben-mama-copil", beneficiaryName: "Mama și copil", unitId: null, unitName: null, propertyAddress: null, requestedCheckIn: "2026-09-14", requestedCheckOut: "2026-09-25", actualCheckIn: null, actualCheckOut: null, status: "PendingApproval", createdByName: "Ligia", createdByUserId: "user-ligia", createdAt: "2026-09-09T09:05:00.000Z", decidedByName: null, decidedAt: null, decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },

  // Aprobate, programate — Dristorului parter (nealocate încă, check-in în viitor)
  { id: "book-bulandra", beneficiaryId: "ben-bulandra", beneficiaryName: "Fam. Bulandra", unitId: null, unitName: null, propertyAddress: null, requestedCheckIn: "2026-09-16", requestedCheckOut: "2026-09-24", actualCheckIn: null, actualCheckOut: null, status: "Approved", createdByName: "Alexandra", createdByUserId: "user-alexandra", createdAt: "2026-09-08T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-09-08T11:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-hospice", beneficiaryId: "ben-hospice", beneficiaryName: "Beneficiar hospice", unitId: null, unitName: null, propertyAddress: null, requestedCheckIn: "2026-09-25", requestedCheckOut: "2026-10-09", actualCheckIn: null, actualCheckOut: null, status: "Approved", createdByName: "Alexandra", createdByUserId: "user-alexandra", createdAt: "2026-09-08T10:10:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-09-08T11:10:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },

  // Respinsă — beneficiar blocat
  { id: "book-olariu", beneficiaryId: "ben-olariu", beneficiaryName: "Olariu", unitId: null, unitName: null, propertyAddress: null, requestedCheckIn: "2026-09-13", requestedCheckOut: "2026-09-15", actualCheckIn: null, actualCheckOut: null, status: "Rejected", createdByName: "Ligia", createdByUserId: "user-ligia", createdAt: "2026-09-07T09:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-09-07T14:00:00.000Z", decisionNote: "Beneficiar blocat.", caseManagerUserId: null, caseManagerName: null, comments: [] },

  // Anulată (exemplu, pentru acoperirea acestui status în UI)
  { id: "book-enache", beneficiaryId: "ben-enache", beneficiaryName: "Fam. Enache", unitId: null, unitName: null, propertyAddress: null, requestedCheckIn: "2026-09-20", requestedCheckOut: "2026-09-28", actualCheckIn: null, actualCheckOut: null, status: "Cancelled", createdByName: "David", createdByUserId: "user-david", createdAt: "2026-09-05T09:00:00.000Z", decidedByName: null, decidedAt: null, decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },

  // Încheiate — eșantion din istoricul real de cazări (fiecare locație are un total
  // "lifetime" mult mai mare — vezi `lifetimeStayDays`/`lifetimeBookingsCompleted` de
  // pe fiecare `PropertyDto` — dar nu re-introducem toate sutele de rânduri istorice)
  { id: "book-jinga", beneficiaryId: "ben-jinga", beneficiaryName: "Jingă Florina", unitId: "unit-laborator-124", unitName: "Ap. 124", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124", requestedCheckIn: "2026-08-03", requestedCheckOut: "2026-09-09", actualCheckIn: "2026-08-03", actualCheckOut: "2026-09-09", status: "Completed", createdByName: "David", createdByUserId: "user-david", createdAt: "2026-08-02T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-08-02T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-barculescu", beneficiaryId: "ben-barculescu", beneficiaryName: "Bărculescu Claudia", unitId: "unit-laborator-124", unitName: "Ap. 124", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124", requestedCheckIn: "2026-07-21", requestedCheckOut: "2026-07-23", actualCheckIn: "2026-07-21", actualCheckOut: "2026-07-23", status: "Completed", createdByName: "David", createdByUserId: "user-david", createdAt: "2026-07-20T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-07-20T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-duroi", beneficiaryId: "ben-duroi", beneficiaryName: "Fam. Duroi", unitId: "unit-laborator-94", unitName: "Ap. 94", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 8, ap. 94", requestedCheckIn: "2026-09-06", requestedCheckOut: "2026-09-09", actualCheckIn: "2026-09-06", actualCheckOut: "2026-09-09", status: "Completed", createdByName: "Ligia", createdByUserId: "user-ligia", createdAt: "2026-09-05T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-09-05T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-andrei-mihai", beneficiaryId: "ben-andrei-mihai", beneficiaryName: "Andrei Mihai", unitId: "unit-laborator-94", unitName: "Ap. 94", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 8, ap. 94", requestedCheckIn: "2026-09-01", requestedCheckOut: "2026-09-03", actualCheckIn: "2026-09-01", actualCheckOut: "2026-09-03", status: "Completed", createdByName: "Ligia", createdByUserId: "user-ligia", createdAt: "2026-08-31T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-08-31T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-silochi", beneficiaryId: "ben-silochi", beneficiaryName: "Silochi Viorica", unitId: "unit-dristorului-893", unitName: "Ap. 893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", requestedCheckIn: "2026-07-26", requestedCheckOut: "2026-08-27", actualCheckIn: "2026-07-26", actualCheckOut: "2026-08-27", status: "Completed", createdByName: "Ștefan", createdByUserId: "user-stefan", createdAt: "2026-07-25T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-07-25T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-tirsoreanu-2", beneficiaryId: "ben-tirsoreanu", beneficiaryName: "Tirsoreanu Matilda", unitId: "unit-dristorului-893", unitName: "Ap. 893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", requestedCheckIn: "2026-07-22", requestedCheckOut: "2026-07-24", actualCheckIn: "2026-07-22", actualCheckOut: "2026-07-24", status: "Completed", createdByName: "Ștefan", createdByUserId: "user-stefan", createdAt: "2026-07-21T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-07-21T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-ovcearenco", beneficiaryId: "ben-ovcearenco", beneficiaryName: "Ovcearenco Victor", unitId: "unit-vlad-judetul", unitName: "Ap. 37", propertyAddress: "Str. Vlad Județul, nr. 4, bl. V13, sc. 1, et. 3, ap. 37", requestedCheckIn: "2026-02-09", requestedCheckOut: "2026-06-30", actualCheckIn: "2026-02-09", actualCheckOut: "2026-06-30", status: "Completed", createdByName: "Alexandra", createdByUserId: "user-alexandra", createdAt: "2026-02-08T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-02-08T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-mazilu", beneficiaryId: "ben-mazilu", beneficiaryName: "Mazilu Florin", unitId: "unit-traian-sufragerie", unitName: "Sufragerie", propertyAddress: "Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28", requestedCheckIn: "2026-08-13", requestedCheckOut: "2026-08-17", actualCheckIn: "2026-08-13", actualCheckOut: "2026-08-17", status: "Completed", createdByName: "Cristi", createdByUserId: "user-cristi", createdAt: "2026-08-12T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-08-12T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-corduneanu-stanescu", beneficiaryId: "ben-enache", beneficiaryName: "Fam. Corduneanu", unitId: "unit-stanescu-sufragerie", unitName: "Sufragerie", propertyAddress: "Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6", requestedCheckIn: "2026-09-02", requestedCheckOut: "2026-09-04", actualCheckIn: "2026-09-02", actualCheckOut: "2026-09-04", status: "Completed", createdByName: "Miriam", createdByUserId: "user-miriam", createdAt: "2026-09-01T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2026-09-01T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-ivan-erik", beneficiaryId: "ben-ivan-erik", beneficiaryName: "Ivan Erik", unitId: "unit-elev-stefanescu", unitName: "Ap. 32", propertyAddress: "Str. Elev Ștefan Ștefănescu, nr. 9, bl. 449, sc. A, et. 2, ap. 32", requestedCheckIn: "2025-09-27", requestedCheckOut: "2025-10-12", actualCheckIn: "2025-09-27", actualCheckOut: "2025-10-12", status: "Completed", createdByName: "Alexandra", createdByUserId: "user-alexandra", createdAt: "2025-09-26T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2025-09-26T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
  { id: "book-chesa", beneficiaryId: "ben-chesa", beneficiaryName: "Chesa Dumitru", unitId: "unit-elev-stefanescu", unitName: "Ap. 32", propertyAddress: "Str. Elev Ștefan Ștefănescu, nr. 9, bl. 449, sc. A, et. 2, ap. 32", requestedCheckIn: "2025-10-20", requestedCheckOut: "2025-10-22", actualCheckIn: "2025-10-20", actualCheckOut: "2025-10-22", status: "Completed", createdByName: "Alexandra", createdByUserId: "user-alexandra", createdAt: "2025-10-19T10:00:00.000Z", decidedByName: "Alexandra", decidedAt: "2025-10-19T12:00:00.000Z", decisionNote: null, caseManagerUserId: null, caseManagerName: null, comments: [] },
];

// --- Mentenanță (fără date reale în evidență — exemple, pe locații reale) -----------
export const maintenanceTickets: MaintenanceTicketDto[] = [
  { id: "maint-1", propertyId: "prop-laborator-124", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124", type: "Supplies", description: "Lipsesc becuri în baie.", priority: "Low", status: "New", estimatedCost: 40, actualCost: null, photoUrl: null, reportedByName: "David", createdAt: isoOffset(-2), assignedToName: null, resolvedAt: null },
  { id: "maint-2", propertyId: "prop-dristorului-893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", type: "Repair", description: "Robinet care picură în bucătărie.", priority: "Medium", status: "Assigned", estimatedCost: 120, actualCost: null, photoUrl: null, reportedByName: "Ligia", createdAt: isoOffset(-5), assignedToName: "Ștefan", resolvedAt: null },
  { id: "maint-3", propertyId: "prop-elev-stefanescu", propertyAddress: "Str. Elev Ștefan Ștefănescu, nr. 9, bl. 449, sc. A, et. 2, ap. 32", type: "Urgent", description: "Fără apă caldă.", priority: "Urgent", status: "InProgress", estimatedCost: 300, actualCost: null, photoUrl: null, reportedByName: "Alexandra", createdAt: isoOffset(-1), assignedToName: "Cristi", resolvedAt: null },
  { id: "maint-4", propertyId: "prop-traian-popovici", propertyAddress: "Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28", type: "Repair", description: "Ușă dulap ieșită din balamale.", priority: "Low", status: "Resolved", estimatedCost: 30, actualCost: 25, photoUrl: null, reportedByName: "Cristi", createdAt: isoOffset(-8), assignedToName: "Cristi", resolvedAt: isoOffset(-3) },
];

// --- Curățenie: ture punctuale + rotația reală de responsabili ---------------------
export const cleaningTasks: CleaningTaskDto[] = [
  { id: "clean-1", unitId: "unit-laborator-124", unitName: "Ap. 124", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124", scheduledDate: todayIso(), status: "Pending", completedByName: null, completedAt: null, notes: "Verificare înainte de sosirea Danielei Adina (15/09)." },
  { id: "clean-2", unitId: "unit-dristorului-893", unitName: "Ap. 893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", scheduledDate: dateOffset(-6), status: "Done", completedByName: "Ștefan", completedAt: isoOffset(-6), notes: null },
];

// Rotația reală (Repartizare locații EMAUS pentru curățenie) — o intrare per persoană
// responsabilă pe fiecare locație (sursa listează 1-4 responsabili per locație).
export const cleaningAssignments: CleaningAssignmentDto[] = [
  { id: "assign-1", propertyId: "prop-laborator-124", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124", volunteerUserId: "user-david", volunteerName: "David", scheduledDayOfWeek: "Sunday" },
  { id: "assign-2", propertyId: "prop-laborator-124", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124", volunteerUserId: "user-alina", volunteerName: "Alina", scheduledDayOfWeek: "Sunday" },
  { id: "assign-3", propertyId: "prop-laborator-94", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 8, ap. 94", volunteerUserId: "user-ligia", volunteerName: "Ligia", scheduledDayOfWeek: "Thursday" },
  { id: "assign-4", propertyId: "prop-laborator-94", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 8, ap. 94", volunteerUserId: "user-ioana", volunteerName: "Ioana", scheduledDayOfWeek: "Thursday" },
  { id: "assign-5", propertyId: "prop-dristorului-893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", volunteerUserId: "user-stefan", volunteerName: "Ștefan", scheduledDayOfWeek: "Saturday" },
  { id: "assign-6", propertyId: "prop-dristorului-893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", volunteerUserId: "user-alina", volunteerName: "Alina", scheduledDayOfWeek: "Saturday" },
  { id: "assign-7", propertyId: "prop-dristorului-893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", volunteerUserId: "user-dominic", volunteerName: "Dominic", scheduledDayOfWeek: "Saturday" },
  { id: "assign-8", propertyId: "prop-dristorului-893", propertyAddress: "Str. Dristorului, nr. 97-119, bl. 63, sc. 3, et. 9, ap. 893", volunteerUserId: "user-ema", volunteerName: "Ema", scheduledDayOfWeek: "Saturday" },
  { id: "assign-9", propertyId: "prop-vlad-judetul", propertyAddress: "Str. Vlad Județul, nr. 4, bl. V13, sc. 1, et. 3, ap. 37", volunteerUserId: "user-sami", volunteerName: "Sami", scheduledDayOfWeek: "Saturday" },
  { id: "assign-10", propertyId: "prop-vlad-judetul", propertyAddress: "Str. Vlad Județul, nr. 4, bl. V13, sc. 1, et. 3, ap. 37", volunteerUserId: "user-cristi", volunteerName: "Cristi", scheduledDayOfWeek: "Saturday" },
  { id: "assign-11", propertyId: "prop-traian-popovici", propertyAddress: "Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28", volunteerUserId: "user-rebeca", volunteerName: "Rebeca", scheduledDayOfWeek: "Saturday" },
  { id: "assign-12", propertyId: "prop-traian-popovici", propertyAddress: "Str. Traian Popovici, nr. 132, bl. B3D, sc. A, et. 5, ap. 28", volunteerUserId: "user-elena", volunteerName: "Elena", scheduledDayOfWeek: "Saturday" },
  { id: "assign-13", propertyId: "prop-stanescu-gheorghe", propertyAddress: "Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6", volunteerUserId: "user-alexandra", volunteerName: "Alexandra", scheduledDayOfWeek: "Saturday" },
  { id: "assign-14", propertyId: "prop-stanescu-gheorghe", propertyAddress: "Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6", volunteerUserId: "user-miriam", volunteerName: "Miriam", scheduledDayOfWeek: "Saturday" },
  { id: "assign-15", propertyId: "prop-stanescu-gheorghe", propertyAddress: "Str. Stănescu Gheorghe, nr. 1, bl. 213, sc. A, et. 1, ap. 6", volunteerUserId: "user-florentina", volunteerName: "Florentina", scheduledDayOfWeek: "Saturday" },
];

// --- Activități (fără date reale în evidență — exemple, pe locații reale) ----------
export const opportunities: MockOpportunity[] = [
  { id: "opp-1", type: "Cleaning", title: "Curățenie generală Ap. 124", description: "Aducem produsele, durează aproximativ 2 ore.", scheduledAt: dateTimeOffset(2, 10, 0), hasTime: true, propertyId: "prop-laborator-124", propertyAddress: "Str. Laborator, nr. 124, bl. 40, sc. A, et. 11, ap. 124", capacity: 4, signedUpUserIds: ["user-david"] },
  { id: "opp-2", type: "Event", title: "Zi de socializare cu beneficiarii", description: "Ieșire în parc, cu gustări pentru toată lumea.", scheduledAt: dateTimeOffset(7, 16, 0), hasTime: true, propertyId: null, propertyAddress: null, capacity: null, signedUpUserIds: ["user-david", "user-ligia"] },
  { id: "opp-3", type: "Visit", title: "Vizită de evaluare locație nouă", description: null, scheduledAt: dateTimeOffset(3, 0, 0), hasTime: false, propertyId: null, propertyAddress: null, capacity: 2, signedUpUserIds: [] },
  { id: "opp-4", type: "Promotion", title: "Stand de informare la eveniment caritabil", description: "Avem nevoie de 2-3 voluntari pentru câteva ore.", scheduledAt: dateTimeOffset(12, 18, 0), hasTime: true, propertyId: null, propertyAddress: null, capacity: 6, signedUpUserIds: [] },
  { id: "opp-5", type: "Event", title: "Renovare mică la Ap. 32 — dată de stabilit", description: "Căutăm voluntari cu experiență; data exactă se confirmă ulterior.", scheduledAt: null, hasTime: false, propertyId: "prop-elev-stefanescu", propertyAddress: "Str. Elev Ștefan Ștefănescu, nr. 9, bl. 449, sc. A, et. 2, ap. 32", capacity: null, signedUpUserIds: [] },
];

// --- Notificări ------------------------------------------------------------------------
function notif(userId: string, type: NotificationType, message: string, relatedEntityType: string | null, relatedEntityId: string | null, isRead: boolean, daysAgo: number): MockNotification {
  return { id: nextId("notif"), userId, type, message, relatedEntityType, relatedEntityId, isRead, createdAt: isoOffset(-daysAgo) };
}

export const notifications: MockNotification[] = [
  notif("user-alexandra", "NewBookingRequest", "Cerere nouă de cazare pentru Daniela Adina.", "Booking", "book-daniela", false, 1),
  notif("user-alexandra", "NewBookingRequest", "Cerere nouă de cazare pentru Mama și copil.", "Booking", "book-mama-copil", false, 1),
  notif("user-alexandra", "NewCommentOnBooking", "Comentariu nou la solicitarea lui Cotulbea Marian.", "Booking", "book-cotulbea", true, 10),
  notif("user-alexandra", "NewMaintenanceTicket", "Sesizare nouă: Fără apă caldă.", "Maintenance", "maint-3", false, 1),
  notif("user-david", "NewOpportunityPublished", "Activitate nouă: Zi de socializare cu beneficiarii.", null, null, true, 6),
  notif("user-david", "UnitNeedsCleaning", "Ap. 124 are nevoie de verificare înainte de următoarea cazare.", null, null, false, 0),
];

// --- Meniu (bară de jos + ecranul „Meniu") — vezi comentariul de pe MenuConfigDto ---
// Ținut aici ca orice altă "cerere de configurare"; se servește neschimbat de
// `GET /api/menu`, dar poate fi editat independent de rutele efective din `app/`.
export const menuConfig: MenuConfigDto = {
  tabs: [
    { key: "locations", label: "Locații", href: "/", icon: "🏠" },
    { key: "bookings", label: "Solicitări", href: "/bookings", icon: "📋" },
    { key: "opportunities", label: "Activități", href: "/opportunities", icon: "🤝" },
    { key: "menu", label: "Meniu", href: "/menu", icon: "•••" },
  ],
  moreSections: [
    {
      title: "Gestiune",
      items: [
        { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "📊" },
        { key: "beneficiaries", label: "Beneficiari", href: "/beneficiaries", icon: "🧑‍🤝‍🧑" },
        { key: "maintenance", label: "Mentenanță", href: "/maintenance", icon: "🔧" },
        { key: "cleaning", label: "Curățenie", href: "/cleaning", icon: "🧹" },
        { key: "notifications", label: "Notificări", href: "/notifications", icon: "🔔" },
        { key: "documents", label: "Documente utile", href: "/documents", icon: "📄" },
      ],
    },
  ],
};

// Valori de configurare pentru dashboard (Meniu → Dashboard), care NU se pot calcula
// din restul datelor — spre deosebire de tot ce e mai sus, astea nu vin din evidența
// reală trimisă de utilizator (n-a fost inclusă), sunt placeholder. Actualizează-le cu
// cifrele reale ale asociației când le ai.
export const orgInfo = {
  // Reală, primită de la utilizator (2026-09) — spre deosebire de restul câmpurilor
  // de mai jos, care rămân placeholder până primim cifrele.
  startDate: "2022-01-24",
  currentBalance: 0,
  estimatedMonthlyExpenses: 0,
  contactPhone: null as string | null,
  announcement: null as string | null,
};

export const db = { users, properties, beneficiaries, bookings, maintenanceTickets, cleaningTasks, cleaningAssignments, opportunities, notifications };

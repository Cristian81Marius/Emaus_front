// Oglindă a DTO-urilor din backend (Emaus.Api/Dtos). Ținute manual sincronizate —
// dacă schimbi un record C# acolo, schimbă și tipul de-aici. Pentru un proiect mai
// mare merită generate automat dintr-un schema OpenAPI, dar pentru schelet, tipurile
// scrise de mână sunt mai ușor de citit și de urmărit.

export type UserRole = "Volunteer" | "Nucleus";

/** [NOU] — un cont poate exista în trei stări: `PendingApproval` (auto-înregistrat,
 * așteaptă un Nucleus), `Active` (poate face login), `Rejected` (cererea a fost
 * respinsă). Separat de `IsActive` din backend (dezactivare ulterioară a unui cont deja
 * activ) — nemodelat încă în mock, nu e nevoie pentru fluxul de înregistrare/aprobare. */
export type UserStatus = "PendingApproval" | "Active" | "Rejected";

export interface UserDto {
  id: string;
  fullName: string;
  // [NOU] nullable — un cont auto-înregistrat poate avea un singur identificator
  // (doar telefon SAU doar email), nu neapărat amândouă.
  phone: string | null;
  email: string | null;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: UserDto;
}

/** [NOU] — body pentru `POST /api/auth/register` (auto-înregistrare, "Cere acces").
 * Cel puțin unul din `phone`/`email` obligatoriu — validat și pe client (vezi
 * app/register.tsx), dar backend-ul tot verifică, nu presupune că clientul a prins tot. */
export interface RegisterRequest {
  fullName: string;
  phone?: string;
  email?: string;
  password: string;
  requestedRole: UserRole;
}

/** [NOU] — o cerere de acces în așteptare, `GET /api/users/pending` (Nucleus). */
export interface PendingUserDto {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  requestedRole: UserRole;
  createdAt: string;
}

/** [NOU] — `role` opțional: suprascrie rolul cerut la înregistrare, dacă Nucleus
 * decide altfel (ex. cineva a bifat greșit "Nucleus" în loc de "Voluntar"). */
export interface ApproveUserRequest {
  role?: UserRole;
}

/** [NOU] — `reason` opțional, la fel ca la respingerea unei solicitări de cazare. */
export interface RejectUserRequest {
  reason?: string;
}

export type UnitStatus = "Available" | "Occupied" | "NeedsCleaning" | "CleaningInProgress" | "Unavailable";

export interface UnitDto {
  id: string;
  propertyId: string;
  name: string;
  capacity: number;
  status: UnitStatus;
  statusNotes: string | null;
}

export interface PropertyDto {
  id: string;
  address: string;
  // Etichetă scurtă pentru liste (ex. "Str. Laborator nr. 124, ap. 124") — adresa
  // completă (`address`) apare doar pe fișa locației, nu și în listă (ecranul de
  // Locații trebuie să rămână ușor de citit dintr-o privire).
  shortLabel: string;
  isTemporary: boolean;
  notes: string | null;
  // Câmpuri noi (2026-09) — apar în evidența reală (interfon, cine are cheile,
  // totaluri istorice) dar nu existau încă în DTO. Nu sunt încă oglindite în DTO-ul
  // C# din backend — de adăugat acolo când ne reconectăm (vezi mobile/CLAUDE.md).
  interfon: string | null;
  keyHolders: string[];
  keyNotes: string | null;
  lifetimeStayDays: number | null;
  lifetimeBookingsCompleted: number | null;
  units: UnitDto[];
  /** Arhivată = nu mai apare implicit pe ecranul de Locații (contract de închiriere
   * încheiat etc.) — NU o ștergere reală, istoricul rămâne intact. Vezi comutatorul
   * "Arată arhivate" din app/index.tsx. */
  isArchived: boolean;
}

/** Statistici agregate, pentru un rezumat rapid pe ecranul de Locații. Numărul de
 * locații/unități/ocupate e calculat live din datele curente; totalurile "lifetime"
 * (zile de cazare, cazări încheiate) vin din `PropertyDto.lifetimeStayDays` /
 * `lifetimeBookingsCompleted`, însumate — istoricul complet nu e încă introdus
 * rând-cu-rând, doar totalurile raportate. */
export interface OverviewStatsDto {
  locationsCount: number;
  unitsCount: number;
  occupiedUnitsCount: number;
  lifetimeStayDays: number;
  lifetimeStayYears: number;
  lifetimeBookingsCompleted: number;
  // Câmpuri noi (2026-09), pentru dashboard-ul din Meniu — vezi mobile/CLAUDE.md.
  // Nu sunt încă în DTO-ul C# din backend.
  volunteersCount: number;
  /** Beneficiari distincți cu o cazare efectivă (Activă/Încheiată) începută anul curent. */
  beneficiariesThisYear: number;
  /** Data de start a proiectului ("AAAA-LL-ZZ") — vezi `orgInfo.startDate`. */
  startDate: string;
  /** Sold curent al asociației — valoare de configurare (`orgInfo` din mock/data.ts),
   * nu se calculează din alte date. */
  currentBalance: number;
  /** Cheltuieli lunare estimative ale asociației — valoare de configurare, ca
   * `currentBalance`, nu calculată. */
  estimatedMonthlyExpenses: number;
  /** Numărul de contact al Emaus ca asociație (nu al unui voluntar anume). */
  contactPhone: string | null;
  /** O singură noutate/anunț curent, afișat pe dashboard — `null` dacă nu e setat. */
  announcement: string | null;
}

/** Răspuns paginat — folosit de `GET /api/beneficiaries`, unde lista poate deveni
 * lungă și se încarcă în pagini de `pageSize`, nu toată deodată (vezi
 * `mobile/CLAUDE.md`). `hasMore` spune dacă mai există o pagină următoare. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export type BeneficiaryStatus = "Active" | "Blocked";

export interface BeneficiaryDto {
  id: string;
  fullName: string;
  phone: string | null;
  localityId: number | null;
  localityName: string | null;
  localityFreeText: string | null;
  // [NOU] — cerute de "Contractul de acordare a serviciilor sociale" (I. Părțile
  // contractului), nu doar de fișa internă. `address` e domiciliul stabil (stradă/nr.)
  // — `localityFreeText`/`localityName` rămân doar localitate/județ.
  address: string | null;
  idCardSeries: string | null;
  idCardNumber: string | null;
  // Persoana de sprijin desemnată de beneficiar — NU managerul de caz (acela e pe
  // BookingDto, poate diferi de la o cazare la alta; persoana de sprijin ține de
  // beneficiar ca persoană).
  supportPersonName: string | null;
  supportPersonPhone: string | null;
  age: number | null;
  materialSituation: string | null;
  referralSource: string | null;
  status: BeneficiaryStatus;
  blockedReason: string | null;
  accountBalance: number;
  notes: string | null;
}

/** Body-ul pentru `POST /api/documents/housing-contract/fill` — vezi
 * HousingContractFillRequest.cs în backend (Emaus.Api/Dtos/Documents/DocumentDtos.cs).
 * TOATE câmpurile sunt opționale, inclusiv `signaturePngBase64` — cineva poate genera
 * contractul completat și fără semnătură (ex. de printat și semnat pe hârtie), câmpul
 * de semnătură rămâne atunci gol în PDF. Un câmp lipsă nu dă eroare. Numele
 * proprietăților sunt EXACT cele din DTO-ul C#/din câmpurile AcroForm ale
 * template-ului — nu le redenumi fără să schimbi și backend-ul. */
export interface HousingContractFillRequest {
  numeCompletBenef?: string;
  telefonBenef?: string;
  seria?: string;
  numar?: string;
  adresa?: string;
  localitate?: string;
  judet?: string;
  numeContactUrgenta?: string;
  telefonContactUrgenta?: string;
  numeResponsabilCazare?: string;
  ziuaInceput?: string;
  lunaInceput?: string;
  anInceput?: string;
  ziSfarsit?: string;
  lunaSfarsit?: string;
  anSfarsit?: string;
  completNameBenef?: string;
  locatiaCazarii?: string;
  dataCazarii?: string;
  /** PNG codat base64 (cu sau fără prefixul "data:image/png;base64,"). Opțional. */
  signaturePngBase64?: string;
}

export type BookingStatus = "PendingApproval" | "Approved" | "Rejected" | "Active" | "Completed" | "Cancelled";

export interface BookingCommentDto {
  id: string;
  authorUserId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface BookingDto {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  // Nou (2026-09) — ca telefonul beneficiarului să fie apăsabil (sună/WhatsApp/SMS)
  // direct din listele/fișele de Solicitări și Locații, fără un fetch separat pe
  // beneficiar. Nu e încă în DTO-ul C# din backend — vezi mobile/CLAUDE.md.
  beneficiaryPhone: string | null;
  unitId: string | null;
  unitName: string | null;
  propertyAddress: string | null;
  requestedCheckIn: string;
  requestedCheckOut: string;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  status: BookingStatus;
  createdByName: string;
  createdAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  // [NOU] — managerul de caz PER CAZARE (poate diferi de la o cazare la alta a
  // aceluiași beneficiar), cerut de contractul de servicii sociale. Orice utilizator
  // din echipă (voluntar sau Nucleus) — setat prin PATCH /api/bookings/{id}.
  caseManagerUserId: string | null;
  caseManagerName: string | null;
  comments: BookingCommentDto[];
}

export type MaintenanceTicketType = "Supplies" | "Repair" | "Urgent";
export type MaintenanceTicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type MaintenanceTicketStatus = "New" | "Assigned" | "InProgress" | "Resolved";

export interface MaintenanceTicketDto {
  id: string;
  propertyId: string;
  propertyAddress: string;
  type: MaintenanceTicketType;
  description: string;
  priority: MaintenanceTicketPriority;
  status: MaintenanceTicketStatus;
  estimatedCost: number | null;
  actualCost: number | null;
  photoUrl: string | null;
  reportedByName: string;
  createdAt: string;
  assignedToName: string | null;
  resolvedAt: string | null;
}

export type CleaningTaskStatus = "Pending" | "InProgress" | "Done";

export interface CleaningTaskDto {
  id: string;
  unitId: string;
  unitName: string;
  propertyAddress: string;
  scheduledDate: string;
  status: CleaningTaskStatus;
  completedByName: string | null;
  completedAt: string | null;
  notes: string | null;
}

// System.DayOfWeek pe .NET — serializat ca text de JsonStringEnumConverter (vezi Program.cs),
// nu ca 0-6, deci numele exacte în engleză ale membrilor enum-ului, nu un index numeric.
export type DayOfWeekName = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface CleaningAssignmentDto {
  id: string;
  propertyId: string;
  propertyAddress: string;
  volunteerUserId: string;
  volunteerName: string;
  scheduledDayOfWeek: DayOfWeekName | null;
}

export type OpportunityType = "Cleaning" | "Event" | "Visit" | "Promotion";

export interface OpportunityDto {
  id: string;
  type: OpportunityType;
  title: string;
  description: string | null;
  // Nou (2026-09) — data (și ora) la crearea unei activități sunt amândouă opționale
  // acum (pot fi completate/schimbate mai târziu) — `scheduledAt` poate fi `null`
  // ("dată de stabilit"). Când e setat, ora rămâne opțională separat: `hasTime` spune
  // dacă `scheduledAt` chiar are o oră aleasă sau doar ține data (ora internă "00:00",
  // ignorată de UI când `hasTime` e false). Nu e încă în DTO-ul C# din backend.
  scheduledAt: string | null;
  hasTime: boolean;
  propertyId: string | null;
  propertyAddress: string | null;
  capacity: number | null;
  signedUpCount: number;
  currentUserSignedUp: boolean;
}

export type NotificationType =
  | "NewBookingRequest"
  | "BookingDecided"
  | "NewCommentOnBooking"
  | "UnitNeedsCleaning"
  | "NewMaintenanceTicket"
  | "MaintenanceTicketAssigned"
  | "NewOpportunityPublished"
  | "NewUserRequest";

export interface NotificationDto {
  id: string;
  type: NotificationType;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Structura meniului aplicației (bara de jos + lista din ecranul „Meniu"), servită de
 * backend (`GET /api/menu`) — ca eticheta/iconița/ordinea unui tab să poată fi schimbate
 * din backend fără un update de aplicație. Rută nouă, fără corespondent încă în
 * `docs/API.md` — vezi mobile/CLAUDE.md. `icon` e un emoji (sau "•••" pentru Meniu) — nu
 * există o bibliotecă de iconițe în proiect, ca să nu adăugăm o dependență doar pentru
 * bara de jos. */
export interface MenuItemDto {
  key: string;
  label: string;
  href: string;
  icon: string;
}

export interface MenuSectionDto {
  title: string;
  items: MenuItemDto[];
}

export interface MenuConfigDto {
  /** Exact cele patru elemente din bara de jos — ultimul e mereu destinația „Meniu". */
  tabs: MenuItemDto[];
  /** Restul paginilor, grupate pe secțiuni — afișate pe ecranul „Meniu". */
  moreSections: MenuSectionDto[];
}

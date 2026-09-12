// Router-ul mock — imită formatul și regulile din docs/API.md, fără rețea. Fiecare
// rută de-aici corespunde 1-la-1 unui rând din tabelul de-acolo (metodă, cine are
// voie, ce face). Vezi mobile/CLAUDE.md pentru cum se adaugă o rută nouă.
import {
  BeneficiaryDto,
  BookingDto,
  CleaningAssignmentDto,
  CleaningTaskDto,
  MaintenanceTicketDto,
  NotificationType,
  OpportunityDto,
  OverviewStatsDto,
  PropertyDto,
  UnitDto,
  UnitStatus,
  UserDto,
} from "../types";
import { db, menuConfig, MockBooking, MockNotification, MockUser, nextId, nowIso, orgInfo, todayIso } from "./data";
import { emitPushEvent } from "./events";
import { BobBeneficiaryDto, BobDeliveryRecordDto, BobStatsDto, BoxItemDto } from "../bobTypes";
import { bobConfig, bobDb, bobMenuConfig, nextBobId } from "./bobData";
import { loadPurchaseHistory, savePurchaseHistory } from "./bobHistoryStore";

export class MockApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
}

function publicUser(u: MockUser): UserDto {
  const { password, ...rest } = u;
  return rest;
}

function currentUser(token: string | null): MockUser {
  if (!token) throw new MockApiError(401, "Autentificare necesară.");
  const id = token.replace("mock:", "");
  const user = db.users.find((u) => u.id === id);
  if (!user) throw new MockApiError(401, "Sesiune invalidă — te rugăm să intri din nou în cont.");
  return user;
}

function requireNucleus(user: MockUser) {
  if (user.role !== "Nucleus") throw new MockApiError(403, "Acțiune permisă doar Nucleului.");
}

function findUnit(unitId: string): { unit: UnitDto; property: PropertyDto } | null {
  for (const property of db.properties) {
    const unit = property.units.find((u) => u.id === unitId);
    if (unit) return { unit, property };
  }
  return null;
}

/** Scrie notificarea pentru fiecare destinatar în `db.notifications` (ce vede fiecare
 * în tab-ul Notificări) și emite UN SINGUR eveniment de previzualizare push pentru tot
 * grupul (nu unul per destinatar — altfel "anunță toți voluntarii" ar declanșa 14
 * bannere deodată). Vezi `PushNotificationOverlay` — acolo se afișează efectiv. */
function notifyMany(userIds: string[], type: NotificationType, message: string, relatedEntityType: string | null = null, relatedEntityId: string | null = null) {
  const recipients = db.users.filter((u) => userIds.includes(u.id));
  recipients.forEach((u) => {
    const entry: MockNotification = { id: nextId("notif"), userId: u.id, type, message, relatedEntityType, relatedEntityId, isRead: false, createdAt: nowIso() };
    db.notifications.push(entry);
  });
  if (recipients.length > 0) {
    emitPushEvent({ type, message, relatedEntityType, relatedEntityId, recipientNames: recipients.map((u) => u.fullName) });
  }
}

function notify(userId: string, type: NotificationType, message: string, relatedEntityType: string | null = null, relatedEntityId: string | null = null) {
  notifyMany([userId], type, message, relatedEntityType, relatedEntityId);
}

function notifyNucleus(type: NotificationType, message: string, relatedEntityType: string | null = null, relatedEntityId: string | null = null) {
  notifyMany(db.users.filter((u) => u.role === "Nucleus").map((u) => u.id), type, message, relatedEntityType, relatedEntityId);
}

function notifyVolunteers(type: NotificationType, message: string) {
  notifyMany(db.users.filter((u) => u.role === "Volunteer").map((u) => u.id), type, message);
}

/** Voluntarii din rotația de curățenie a unei locații — cine ar trebui anunțat când o
 * unitate devine "are nevoie de curățenie". */
function cleaningVolunteerIdsFor(propertyId: string): string[] {
  return [...new Set(db.cleaningAssignments.filter((a) => a.propertyId === propertyId).map((a) => a.volunteerUserId))];
}

/** Formă normalizată, fără diacritice, pentru căutare insensibilă la ele — "ati" trebuie
 * să găsească "ăâîșț" (NFD descompune fiecare literă cu diacritice în literă de bază +
 * semn combinator separat; U+0300–U+036F acoperă toate semnele combinatoare relevante,
 * inclusiv variantele vechi cu sedilă ş/ţ, nu doar ș/ț cu virgulă). */
const DIACRITIC_MARKS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeSearchText(s: string): string {
  return s.normalize("NFD").replace(DIACRITIC_MARKS_RE, "").toLowerCase();
}

function stripBooking(b: MockBooking): BookingDto {
  const { createdByUserId, ...rest } = b;
  // Calculat la servire, nu ținut duplicat pe fiecare rezervare — telefonul
  // beneficiarului rămâne mereu sincronizat cu fișa lui curentă din `db.beneficiaries`.
  const beneficiaryPhone = db.beneficiaries.find((x) => x.id === b.beneficiaryId)?.phone ?? null;
  return { ...rest, beneficiaryPhone };
}

function toOpportunityDto(o: (typeof db.opportunities)[number], viewer: MockUser): OpportunityDto {
  const { signedUpUserIds, ...rest } = o;
  return { ...rest, signedUpCount: signedUpUserIds.length, currentUserSignedUp: signedUpUserIds.includes(viewer.id) };
}

// --- Rute --------------------------------------------------------------------------

interface RouteCtx {
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
}

type Handler = (ctx: RouteCtx, user: MockUser) => unknown;

interface Route {
  method: string;
  pattern: string;
  nucleusOnly?: boolean;
  handler: Handler;
}

const routes: Route[] = [
  // Utilizatori
  {
    method: "GET",
    pattern: "/api/users",
    nucleusOnly: true,
    // Doar conturile Active — cererile în așteptare/respinse NU apar aici (ar strica
    // pickerele de voluntari din mentenanță/curățenie, care ar arăta conturi ce încă
    // nu pot face nimic).
    handler: () => db.users.filter((u) => u.status === "Active").map(publicUser),
  },
  {
    method: "GET",
    pattern: "/api/users/pending",
    nucleusOnly: true,
    handler: () =>
      db.users
        .filter((u) => u.status === "PendingApproval")
        .map((u) => ({ id: u.id, fullName: u.fullName, phone: u.phone, email: u.email, requestedRole: u.role, createdAt: u.createdAt ?? nowIso() }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)), // cele mai vechi primele
  },
  {
    method: "POST",
    pattern: "/api/users/:id/approve",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const account = db.users.find((u) => u.id === params.id);
      if (!account) throw new MockApiError(404, "Cererea nu a fost găsită.");
      if (account.status !== "PendingApproval") throw new MockApiError(409, "Cererea a fost deja procesată.");
      if (body?.role) account.role = body.role;
      account.status = "Active";
      return publicUser(account);
    },
  },
  {
    method: "POST",
    pattern: "/api/users/:id/reject",
    nucleusOnly: true,
    handler: ({ params }) => {
      const account = db.users.find((u) => u.id === params.id);
      if (!account) throw new MockApiError(404, "Cererea nu a fost găsită.");
      if (account.status !== "PendingApproval") throw new MockApiError(409, "Cererea a fost deja procesată.");
      account.status = "Rejected";
      return undefined;
    },
  },

  // Locații
  {
    method: "GET",
    pattern: "/api/properties",
    // Implicit doar cele active — la fel ca backend-ul real (vezi PropertyService.GetAllAsync).
    handler: ({ query }) => {
      const includeArchived = query.get("includeArchived") === "true";
      return includeArchived ? db.properties : db.properties.filter((p) => !p.isArchived);
    },
  },
  {
    method: "GET",
    pattern: "/api/properties/:id",
    handler: ({ params }) => {
      const property = db.properties.find((p) => p.id === params.id);
      if (!property) throw new MockApiError(404, "Locația nu a fost găsită.");
      return property;
    },
  },
  {
    method: "POST",
    pattern: "/api/properties",
    nucleusOnly: true,
    handler: ({ body }) => {
      const property: PropertyDto = {
        id: nextId("prop"),
        address: body.address,
        shortLabel: body.shortLabel,
        isTemporary: body.isTemporary ?? false,
        notes: body.notes ?? null,
        interfon: body.interfon ?? null,
        keyHolders: Array.isArray(body.keyHolders) ? body.keyHolders : [],
        keyNotes: body.keyNotes ?? null,
        lifetimeStayDays: body.lifetimeStayDays ?? null,
        lifetimeBookingsCompleted: body.lifetimeBookingsCompleted ?? null,
        isArchived: false,
        units: [],
      };
      db.properties.push(property);
      return property;
    },
  },
  {
    method: "PATCH",
    pattern: "/api/properties/:id",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const property = db.properties.find((p) => p.id === params.id);
      if (!property) throw new MockApiError(404, "Locația nu a fost găsită.");
      property.address = body.address ?? property.address;
      property.shortLabel = body.shortLabel ?? property.shortLabel;
      property.notes = body.notes ?? null;
      property.interfon = body.interfon ?? null;
      property.keyHolders = Array.isArray(body.keyHolders) ? body.keyHolders : property.keyHolders;
      property.keyNotes = body.keyNotes ?? null;
      return property;
    },
  },
  {
    method: "POST",
    pattern: "/api/properties/:id/archive",
    nucleusOnly: true,
    handler: ({ params }) => {
      const property = db.properties.find((p) => p.id === params.id);
      if (!property) throw new MockApiError(404, "Locația nu a fost găsită.");
      property.isArchived = true;
      return property;
    },
  },
  {
    method: "POST",
    pattern: "/api/properties/:id/unarchive",
    nucleusOnly: true,
    handler: ({ params }) => {
      const property = db.properties.find((p) => p.id === params.id);
      if (!property) throw new MockApiError(404, "Locația nu a fost găsită.");
      property.isArchived = false;
      return property;
    },
  },
  {
    method: "POST",
    pattern: "/api/properties/:id/units",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const property = db.properties.find((p) => p.id === params.id);
      if (!property) throw new MockApiError(404, "Locația nu a fost găsită.");
      const unit: UnitDto = {
        id: nextId("unit"),
        propertyId: property.id,
        name: body.name,
        capacity: body.capacity,
        status: "Available",
        statusNotes: null,
      };
      property.units.push(unit);
      return unit;
    },
  },
  {
    method: "PATCH",
    pattern: "/api/units/:id/status",
    handler: ({ params, body }) => {
      const found = findUnit(params.id);
      if (!found) throw new MockApiError(404, "Unitatea nu a fost găsită.");
      const wasNeedingCleaning = found.unit.status === "NeedsCleaning";
      found.unit.status = body.status as UnitStatus;
      found.unit.statusNotes = body.statusNotes ?? null;
      if (found.unit.status === "NeedsCleaning" && !wasNeedingCleaning) {
        notifyMany(
          cleaningVolunteerIdsFor(found.property.id),
          "UnitNeedsCleaning",
          `${found.unit.name} (${found.property.shortLabel}) are nevoie de curățenie.`,
          "Cleaning",
          found.unit.id
        );
      }
      return found.unit;
    },
  },
  {
    method: "GET",
    pattern: "/api/units/available",
    handler: () => db.properties.flatMap((p) => p.units.filter((u) => u.status === "Available")),
  },

  // Beneficiari
  {
    method: "GET",
    pattern: "/api/beneficiaries",
    // Paginat — lista poate ajunge la sute de beneficiari, nu se trimite toată deodată
    // (vezi mobile/CLAUDE.md). Fără alt filtru activ, ordinea e "recenți întâi": un
    // beneficiar nou se adaugă la finalul lui db.beneficiaries (vezi POST de mai jos),
    // deci array-ul inversat dă exact ordinea cronologică descrescătoare.
    handler: ({ query }) => {
      const search = query.get("search")?.trim();
      const propertyId = query.get("propertyId");
      const page = Math.max(1, Number(query.get("page") ?? "1") || 1);
      const pageSize = Math.max(1, Number(query.get("pageSize") ?? "30") || 30);

      let list = db.beneficiaries.slice().reverse();
      if (propertyId) {
        // Doar beneficiarii cu cel puțin o cazare la ACEA locație — join pe bookings→unit,
        // la fel ca filtrul din backend-ul real (BeneficiaryService.GetAllAsync).
        const beneficiaryIdsHere = new Set(
          db.bookings.filter((b) => b.unitId && findUnit(b.unitId)?.property.id === propertyId).map((b) => b.beneficiaryId)
        );
        list = list.filter((b) => beneficiaryIdsHere.has(b.id));
      }
      if (search) {
        const needle = normalizeSearchText(search);
        list = list.filter((b) => normalizeSearchText(b.fullName).includes(needle) || (b.phone ?? "").includes(search));
      }

      const total = list.length;
      const start = (page - 1) * pageSize;
      const items = list.slice(start, start + pageSize);
      return { items, page, pageSize, total, hasMore: start + items.length < total };
    },
  },
  {
    method: "GET",
    pattern: "/api/beneficiaries/:id",
    handler: ({ params }) => {
      const beneficiary = db.beneficiaries.find((b) => b.id === params.id);
      if (!beneficiary) throw new MockApiError(404, "Beneficiarul nu a fost găsit.");
      return beneficiary;
    },
  },
  {
    method: "PATCH",
    pattern: "/api/beneficiaries/:id",
    handler: ({ params, body }) => {
      const beneficiary = db.beneficiaries.find((b) => b.id === params.id);
      if (!beneficiary) throw new MockApiError(404, "Beneficiarul nu a fost găsit.");
      beneficiary.fullName = body.fullName ?? beneficiary.fullName;
      beneficiary.phone = body.phone ?? null;
      beneficiary.localityFreeText = body.localityFreeText ?? null;
      beneficiary.address = body.address ?? null;
      beneficiary.idCardSeries = body.idCardSeries ?? null;
      beneficiary.idCardNumber = body.idCardNumber ?? null;
      beneficiary.supportPersonName = body.supportPersonName ?? null;
      beneficiary.supportPersonPhone = body.supportPersonPhone ?? null;
      beneficiary.age = body.age ?? null;
      beneficiary.materialSituation = body.materialSituation ?? null;
      beneficiary.referralSource = body.referralSource ?? null;
      beneficiary.notes = body.notes ?? null;
      return beneficiary;
    },
  },
  {
    method: "POST",
    pattern: "/api/beneficiaries",
    handler: ({ body }) => {
      const beneficiary: BeneficiaryDto = {
        id: nextId("ben"),
        fullName: body.fullName,
        phone: body.phone ?? null,
        localityId: body.localityId ?? null,
        localityName: null,
        localityFreeText: body.localityFreeText ?? null,
        address: body.address ?? null,
        idCardSeries: body.idCardSeries ?? null,
        idCardNumber: body.idCardNumber ?? null,
        supportPersonName: body.supportPersonName ?? null,
        supportPersonPhone: body.supportPersonPhone ?? null,
        age: body.age ?? null,
        materialSituation: body.materialSituation ?? null,
        referralSource: body.referralSource ?? null,
        status: "Active",
        blockedReason: null,
        accountBalance: 0,
        notes: body.notes ?? null,
      };
      db.beneficiaries.push(beneficiary);
      return beneficiary;
    },
  },
  {
    method: "POST",
    pattern: "/api/beneficiaries/:id/block",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const beneficiary = db.beneficiaries.find((b) => b.id === params.id);
      if (!beneficiary) throw new MockApiError(404, "Beneficiarul nu a fost găsit.");
      beneficiary.status = "Blocked";
      beneficiary.blockedReason = body.reason ?? "Nespecificat";
      return beneficiary;
    },
  },
  {
    method: "POST",
    pattern: "/api/beneficiaries/:id/unblock",
    nucleusOnly: true,
    handler: ({ params }) => {
      const beneficiary = db.beneficiaries.find((b) => b.id === params.id);
      if (!beneficiary) throw new MockApiError(404, "Beneficiarul nu a fost găsit.");
      beneficiary.status = "Active";
      beneficiary.blockedReason = null;
      return beneficiary;
    },
  },

  // Solicitări & cazări
  {
    method: "GET",
    pattern: "/api/bookings",
    handler: ({ query }) => {
      let list = db.bookings.slice();
      const status = query.get("status");
      const unitId = query.get("unitId");
      const propertyId = query.get("propertyId");
      const beneficiaryId = query.get("beneficiaryId");
      if (status) list = list.filter((b) => b.status === status);
      if (unitId) list = list.filter((b) => b.unitId === unitId);
      if (propertyId) list = list.filter((b) => b.unitId && findUnit(b.unitId)?.property.id === propertyId);
      if (beneficiaryId) list = list.filter((b) => b.beneficiaryId === beneficiaryId);
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(stripBooking);
    },
  },
  {
    method: "GET",
    pattern: "/api/bookings/:id",
    handler: ({ params }) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      return stripBooking(booking);
    },
  },
  {
    method: "GET",
    pattern: "/api/bookings/:id/contract",
    handler: ({ params }) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      // Ruta reală întoarce application/pdf (vezi docs/API.md §6) — mockRequest()
      // întoarce doar JSON, nu poate simula bytes binari. Aplicația nu ajunge aici în
      // modul mock (app/bookings/[id].tsx generează local un PDF cu generateFilledPdf
      // din datele deja încărcate), handler-ul e aici doar ca tabelul de rute să rămână
      // complet față de docs/API.md.
      throw new MockApiError(501, "Contractul PDF real nu e disponibil în modul mock — generat local pe ecran.");
    },
  },
  {
    method: "PATCH",
    pattern: "/api/bookings/:id",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      // Perioada solicitată se poate corecta doar cât timp n-a fost încă alocată o
      // unitate — după alocare (Active), perioada reală (actualCheckIn/actualCheckOut)
      // e cea care contează, nu mai are sens să rescrii cererea inițială. Desemnarea
      // managerului de caz NU are restricția asta, se poate face oricând.
      const changesPeriod = body.requestedCheckIn !== undefined || body.requestedCheckOut !== undefined;
      if (changesPeriod && booking.status !== "PendingApproval" && booking.status !== "Approved") {
        throw new MockApiError(409, "Perioada solicitată nu mai poate fi editată după alocare.");
      }
      booking.requestedCheckIn = body.requestedCheckIn ?? booking.requestedCheckIn;
      booking.requestedCheckOut = body.requestedCheckOut ?? booking.requestedCheckOut;
      if (body.caseManagerUserId !== undefined) {
        if (body.caseManagerUserId === null) {
          booking.caseManagerUserId = null;
          booking.caseManagerName = null;
        } else {
          const manager = db.users.find((u) => u.id === body.caseManagerUserId);
          if (!manager) throw new MockApiError(404, "Managerul de caz nu a fost găsit.");
          booking.caseManagerUserId = manager.id;
          booking.caseManagerName = manager.fullName;
        }
      }
      return stripBooking(booking);
    },
  },
  {
    method: "POST",
    pattern: "/api/bookings",
    handler: ({ body }, user) => {
      const beneficiary = db.beneficiaries.find((b) => b.id === body.beneficiaryId);
      if (!beneficiary) throw new MockApiError(404, "Beneficiarul nu a fost găsit.");
      const booking: MockBooking = {
        id: nextId("book"),
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.fullName,
        unitId: null,
        unitName: null,
        propertyAddress: null,
        requestedCheckIn: body.requestedCheckIn,
        requestedCheckOut: body.requestedCheckOut,
        actualCheckIn: null,
        actualCheckOut: null,
        status: "PendingApproval",
        createdByName: user.fullName,
        createdByUserId: user.id,
        createdAt: nowIso(),
        decidedByName: null,
        decidedAt: null,
        decisionNote: null,
        caseManagerUserId: null,
        caseManagerName: null,
        comments: [],
      };
      db.bookings.push(booking);
      notifyNucleus("NewBookingRequest", `Cerere nouă de cazare pentru ${beneficiary.fullName}.`, "Booking", booking.id);
      return stripBooking(booking);
    },
  },
  {
    method: "POST",
    pattern: "/api/bookings/:id/comments",
    handler: ({ params, body }, user) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      booking.comments.push({ id: nextId("comment"), authorUserId: user.id, authorName: user.fullName, text: body.text, createdAt: nowIso() });
      notifyNucleus("NewCommentOnBooking", `Comentariu nou la solicitarea lui ${booking.beneficiaryName}.`, "Booking", booking.id);
      return stripBooking(booking);
    },
  },
  {
    method: "POST",
    pattern: "/api/bookings/:id/decide",
    nucleusOnly: true,
    handler: ({ params, body }, user) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      if (booking.status !== "PendingApproval") throw new MockApiError(409, "Solicitarea a fost deja decisă.");
      booking.status = body.approved ? "Approved" : "Rejected";
      booking.decidedByName = user.fullName;
      booking.decidedAt = nowIso();
      booking.decisionNote = body.note ?? null;
      notify(booking.createdByUserId, "BookingDecided", `Solicitarea lui ${booking.beneficiaryName} a fost ${body.approved ? "aprobată" : "respinsă"}.`, "Booking", booking.id);
      return stripBooking(booking);
    },
  },
  {
    method: "POST",
    pattern: "/api/bookings/:id/allocate",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      if (booking.status !== "Approved") throw new MockApiError(409, "Solicitarea trebuie aprobată înainte de alocare.");
      const found = findUnit(body.unitId);
      if (!found) throw new MockApiError(404, "Unitatea nu a fost găsită.");
      if (found.unit.status !== "Available") throw new MockApiError(409, "Unitatea nu e liberă.");
      found.unit.status = "Occupied";
      booking.unitId = found.unit.id;
      booking.unitName = found.unit.name;
      booking.propertyAddress = found.property.address;
      booking.actualCheckIn = todayIso();
      booking.status = "Active";
      return stripBooking(booking);
    },
  },
  {
    method: "POST",
    pattern: "/api/bookings/:id/checkout",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      if (booking.status !== "Active" || !booking.unitId) throw new MockApiError(409, "Solicitarea nu e activă.");
      const found = findUnit(booking.unitId);
      booking.actualCheckOut = body.actualCheckOutDate ?? todayIso();
      booking.status = "Completed";
      if (found) {
        found.unit.status = "NeedsCleaning";
        const task: CleaningTaskDto = {
          id: nextId("clean"),
          unitId: found.unit.id,
          unitName: found.unit.name,
          propertyAddress: found.property.address,
          scheduledDate: todayIso(),
          status: "Pending",
          completedByName: null,
          completedAt: null,
          notes: null,
        };
        db.cleaningTasks.push(task);
        notifyMany(
          cleaningVolunteerIdsFor(found.property.id),
          "UnitNeedsCleaning",
          `${found.unit.name} (${found.property.shortLabel}) are nevoie de curățenie.`,
          "Cleaning",
          found.unit.id
        );
      }
      return stripBooking(booking);
    },
  },
  {
    method: "POST",
    pattern: "/api/bookings/:id/cancel",
    nucleusOnly: true,
    handler: ({ params }) => {
      const booking = db.bookings.find((b) => b.id === params.id);
      if (!booking) throw new MockApiError(404, "Solicitarea nu a fost găsită.");
      if (booking.unitId || (booking.status !== "PendingApproval" && booking.status !== "Approved")) {
        throw new MockApiError(409, "Doar o solicitare nealocată, în așteptare sau aprobată, poate fi anulată.");
      }
      booking.status = "Cancelled";
      return stripBooking(booking);
    },
  },

  // Mentenanță
  {
    method: "GET",
    pattern: "/api/maintenance",
    handler: ({ query }) => {
      const status = query.get("status");
      let list = db.maintenanceTickets.slice();
      if (status) list = list.filter((t) => t.status === status);
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  },
  {
    method: "POST",
    pattern: "/api/maintenance",
    handler: ({ body }, user) => {
      const property = db.properties.find((p) => p.id === body.propertyId);
      if (!property) throw new MockApiError(404, "Locația nu a fost găsită.");
      const ticket: MaintenanceTicketDto = {
        id: nextId("maint"),
        propertyId: property.id,
        propertyAddress: property.address,
        type: body.type,
        description: body.description,
        priority: body.priority,
        status: "New",
        estimatedCost: body.estimatedCost ?? null,
        actualCost: null,
        photoUrl: body.photoUrl ?? null,
        reportedByName: user.fullName,
        createdAt: nowIso(),
        assignedToName: null,
        resolvedAt: null,
      };
      db.maintenanceTickets.push(ticket);
      notifyNucleus("NewMaintenanceTicket", `Sesizare nouă: ${ticket.description}`, "Maintenance", ticket.id);
      return ticket;
    },
  },
  {
    method: "POST",
    pattern: "/api/maintenance/:id/assign",
    nucleusOnly: true,
    handler: ({ params, body }) => {
      const ticket = db.maintenanceTickets.find((t) => t.id === params.id);
      if (!ticket) throw new MockApiError(404, "Sesizarea nu a fost găsită.");
      const assignee = db.users.find((u) => u.id === body.assignedToUserId);
      if (!assignee) throw new MockApiError(404, "Persoana nu a fost găsită.");
      ticket.assignedToName = assignee.fullName;
      ticket.status = "Assigned";
      notify(assignee.id, "MaintenanceTicketAssigned", `Ți-a fost asignată sesizarea: ${ticket.description}`, "Maintenance", ticket.id);
      return ticket;
    },
  },
  {
    method: "POST",
    pattern: "/api/maintenance/:id/resolve",
    handler: ({ params, body }) => {
      const ticket = db.maintenanceTickets.find((t) => t.id === params.id);
      if (!ticket) throw new MockApiError(404, "Sesizarea nu a fost găsită.");
      ticket.status = "Resolved";
      ticket.actualCost = body.actualCost ?? null;
      ticket.resolvedAt = nowIso();
      return ticket;
    },
  },

  // Curățenie
  {
    method: "GET",
    pattern: "/api/cleaning/tasks",
    handler: ({ query }) => {
      const onlyPending = query.get("onlyPending") === "true";
      let list = db.cleaningTasks.slice();
      if (onlyPending) list = list.filter((t) => t.status !== "Done");
      return list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    },
  },
  {
    method: "POST",
    pattern: "/api/cleaning/tasks/:id/complete",
    handler: ({ params }, user) => {
      const task = db.cleaningTasks.find((t) => t.id === params.id);
      if (!task) throw new MockApiError(404, "Tura nu a fost găsită.");
      task.status = "Done";
      task.completedByName = user.fullName;
      task.completedAt = nowIso();
      const found = findUnit(task.unitId);
      if (found) found.unit.status = "Available";
      return task;
    },
  },
  {
    method: "GET",
    pattern: "/api/cleaning/assignments",
    handler: ({ query }) => {
      const propertyId = query.get("propertyId");
      if (!propertyId) return db.cleaningAssignments;
      return db.cleaningAssignments.filter((a) => a.propertyId === propertyId);
    },
  },
  {
    method: "POST",
    pattern: "/api/cleaning/assignments",
    nucleusOnly: true,
    handler: ({ body }) => {
      const property = db.properties.find((p) => p.id === body.propertyId);
      if (!property) throw new MockApiError(404, "Locația nu a fost găsită.");
      const volunteer = db.users.find((u) => u.id === body.volunteerUserId);
      if (!volunteer) throw new MockApiError(404, "Voluntarul nu a fost găsit.");
      const assignment: CleaningAssignmentDto = {
        id: nextId("assign"),
        propertyId: property.id,
        propertyAddress: property.address,
        volunteerUserId: volunteer.id,
        volunteerName: volunteer.fullName,
        scheduledDayOfWeek: body.scheduledDayOfWeek ?? null,
      };
      db.cleaningAssignments.push(assignment);
      return assignment;
    },
  },

  // Activități (fostă "Voluntariat" — doar denumirea din UI s-a schimbat, ruta/DTO-ul rămân "opportunities")
  {
    method: "GET",
    pattern: "/api/opportunities",
    // Activitățile fără dată stabilită (`scheduledAt: null`) coboară la coada listei —
    // "9999-..." e mai mare decât orice dată reală, deci `localeCompare` le pune ultimele.
    handler: (_ctx, user) =>
      db.opportunities
        .slice()
        .sort((a, b) => (a.scheduledAt ?? "9999-99-99").localeCompare(b.scheduledAt ?? "9999-99-99"))
        .map((o) => toOpportunityDto(o, user)),
  },
  {
    method: "GET",
    pattern: "/api/opportunities/:id",
    handler: ({ params }, user) => {
      const opportunity = db.opportunities.find((o) => o.id === params.id);
      if (!opportunity) throw new MockApiError(404, "Activitatea nu a fost găsită.");
      return toOpportunityDto(opportunity, user);
    },
  },
  {
    method: "POST",
    pattern: "/api/opportunities",
    nucleusOnly: true,
    handler: ({ body }, user) => {
      const property = body.propertyId ? db.properties.find((p) => p.id === body.propertyId) : null;
      const opportunity = {
        id: nextId("opp"),
        type: body.type,
        title: body.title,
        description: body.description ?? null,
        scheduledAt: body.scheduledAt,
        hasTime: !!body.hasTime,
        propertyId: property?.id ?? null,
        propertyAddress: property?.address ?? null,
        capacity: body.capacity ?? null,
        signedUpUserIds: [] as string[],
      };
      db.opportunities.push(opportunity);
      // Opțional — bifat din formularul de creare ("Anunță toți voluntarii"), nu mai
      // automat necondiționat ca înainte.
      if (body.notifyEveryone) {
        notifyVolunteers("NewOpportunityPublished", `Activitate nouă: ${opportunity.title}`);
      }
      return toOpportunityDto(opportunity, user);
    },
  },
  {
    method: "PATCH",
    pattern: "/api/opportunities/:id",
    nucleusOnly: true,
    handler: ({ params, body }, user) => {
      const opportunity = db.opportunities.find((o) => o.id === params.id);
      if (!opportunity) throw new MockApiError(404, "Activitatea nu a fost găsită.");
      const property = body.propertyId ? db.properties.find((p) => p.id === body.propertyId) : null;
      opportunity.type = body.type ?? opportunity.type;
      opportunity.title = body.title ?? opportunity.title;
      opportunity.description = body.description ?? null;
      opportunity.scheduledAt = body.scheduledAt ?? null;
      opportunity.hasTime = !!body.hasTime;
      opportunity.propertyId = property?.id ?? null;
      opportunity.propertyAddress = property?.address ?? null;
      opportunity.capacity = body.capacity ?? null;
      return toOpportunityDto(opportunity, user);
    },
  },
  {
    method: "POST",
    pattern: "/api/opportunities/:id/signup",
    handler: ({ params }, user) => {
      const opportunity = db.opportunities.find((o) => o.id === params.id);
      if (!opportunity) throw new MockApiError(404, "Activitatea nu a fost găsită.");
      if (opportunity.capacity !== null && opportunity.signedUpUserIds.length >= opportunity.capacity && !opportunity.signedUpUserIds.includes(user.id)) {
        throw new MockApiError(409, "Activitatea e completă.");
      }
      if (!opportunity.signedUpUserIds.includes(user.id)) opportunity.signedUpUserIds.push(user.id);
      return toOpportunityDto(opportunity, user);
    },
  },
  {
    method: "DELETE",
    pattern: "/api/opportunities/:id/signup",
    handler: ({ params }, user) => {
      const opportunity = db.opportunities.find((o) => o.id === params.id);
      if (!opportunity) throw new MockApiError(404, "Activitatea nu a fost găsită.");
      opportunity.signedUpUserIds = opportunity.signedUpUserIds.filter((id) => id !== user.id);
      return toOpportunityDto(opportunity, user);
    },
  },

  // Notificări
  {
    method: "GET",
    pattern: "/api/notifications/mine",
    handler: ({ query }, user) => {
      const onlyUnread = query.get("onlyUnread") === "true";
      let list = db.notifications.filter((n) => n.userId === user.id);
      if (onlyUnread) list = list.filter((n) => !n.isRead);
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ userId, ...rest }) => rest);
    },
  },
  {
    method: "POST",
    pattern: "/api/notifications/:id/read",
    handler: ({ params }, user) => {
      const notification = db.notifications.find((n) => n.id === params.id && n.userId === user.id);
      if (!notification) throw new MockApiError(404, "Notificarea nu a fost găsită.");
      notification.isRead = true;
      const { userId, ...rest } = notification;
      return rest;
    },
  },

  // Profil propriu
  { method: "GET", pattern: "/api/auth/me", handler: (_ctx, user) => publicUser(user) },
  {
    method: "PATCH",
    pattern: "/api/auth/me",
    handler: ({ body }, user) => {
      const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
      if (!fullName) throw new MockApiError(400, "Numele nu poate fi gol.");
      user.fullName = fullName;
      // Numele afișat pe cardurile deja create (comentarii, „raportat de”, rotația de
      // curățenie) nu se retroactivează — la fel ca într-un backend real, unde acele
      // câmpuri sunt un instantaneu la momentul acțiunii, nu o referință live la user.
      return publicUser(user);
    },
  },

  // Statistici — rezumat pentru ecranul de Locații (vezi nota din data.ts despre de ce
  // numărul de locații/unități/ocupate se calculează live, nu se preia dintr-un rezumat static).
  {
    method: "GET",
    pattern: "/api/stats/overview",
    handler: () => {
      const allUnits = db.properties.flatMap((p) => p.units);
      const lifetimeStayDays = db.properties.reduce((sum, p) => sum + (p.lifetimeStayDays ?? 0), 0);
      const lifetimeBookingsCompleted = db.properties.reduce((sum, p) => sum + (p.lifetimeBookingsCompleted ?? 0), 0);
      const currentYear = new Date().getFullYear();
      const beneficiariesThisYear = new Set(
        db.bookings
          .filter(
            (b) =>
              (b.status === "Active" || b.status === "Completed") &&
              b.actualCheckIn &&
              new Date(b.actualCheckIn).getFullYear() === currentYear
          )
          .map((b) => b.beneficiaryId)
      ).size;
      const stats: OverviewStatsDto = {
        locationsCount: db.properties.length,
        unitsCount: allUnits.length,
        occupiedUnitsCount: allUnits.filter((u) => u.status === "Occupied").length,
        lifetimeStayDays,
        lifetimeStayYears: Math.round((lifetimeStayDays / 365) * 100) / 100,
        lifetimeBookingsCompleted,
        volunteersCount: db.users.filter((u) => u.role === "Volunteer").length,
        beneficiariesThisYear,
        startDate: orgInfo.startDate,
        currentBalance: orgInfo.currentBalance,
        estimatedMonthlyExpenses: orgInfo.estimatedMonthlyExpenses,
        contactPhone: orgInfo.contactPhone,
        announcement: orgInfo.announcement,
      };
      return stats;
    },
  },

  // Meniu — bara de jos + ecranul „Meniu" citesc de-aici (vezi MenuConfigDto).
  // `?project=bob` (trimis de BottomTabBar/menu.tsx, din ProjectContext) servește
  // meniul BOB în loc de cel Emaus — vezi ProjectContext.tsx pentru de ce comută
  // doar navigarea principală, nu și sesiunea/contul.
  {
    method: "GET",
    pattern: "/api/menu",
    handler: ({ query }) => (query.get("project") === "bob" ? bobMenuConfig : menuConfig),
  },

  // --- Box of Blessing (BOB) — al doilea proiect, vezi bobTypes.ts/bobData.ts ------

  {
    method: "GET",
    pattern: "/api/bob/beneficiaries",
    handler: () => bobDb.beneficiaries,
  },
  {
    method: "GET",
    pattern: "/api/bob/beneficiaries/:id",
    handler: ({ params }) => {
      const beneficiary = bobDb.beneficiaries.find((b) => b.id === params.id);
      if (!beneficiary) throw new MockApiError(404, "Beneficiarul nu a fost găsit.");
      return beneficiary;
    },
  },
  {
    method: "POST",
    pattern: "/api/bob/beneficiaries",
    handler: ({ body }) => {
      const beneficiary: BobBeneficiaryDto = {
        id: nextBobId("bobben"),
        fullName: body.fullName,
        phone: body.phone ?? null,
        mobility: body.mobility ?? null,
        address: body.address ?? null,
        assignedVolunteerName: body.assignedVolunteerName ?? null,
        status: body.status ?? "Active",
        contacted: false,
        delivered: false,
        notes: body.notes ?? null,
      };
      bobDb.beneficiaries.push(beneficiary);
      return beneficiary;
    },
  },
  {
    method: "PATCH",
    pattern: "/api/bob/beneficiaries/:id",
    handler: ({ params, body }) => {
      const beneficiary = bobDb.beneficiaries.find((b) => b.id === params.id);
      if (!beneficiary) throw new MockApiError(404, "Beneficiarul nu a fost găsit.");
      if (body.fullName !== undefined) beneficiary.fullName = body.fullName;
      if (body.phone !== undefined) beneficiary.phone = body.phone;
      if (body.mobility !== undefined) beneficiary.mobility = body.mobility;
      if (body.address !== undefined) beneficiary.address = body.address;
      if (body.assignedVolunteerName !== undefined) beneficiary.assignedVolunteerName = body.assignedVolunteerName;
      if (body.status !== undefined) beneficiary.status = body.status;
      if (body.contacted !== undefined) beneficiary.contacted = body.contacted;
      if (body.delivered !== undefined) beneficiary.delivered = body.delivered;
      if (body.notes !== undefined) beneficiary.notes = body.notes;
      return beneficiary;
    },
  },

  {
    method: "GET",
    pattern: "/api/bob/box",
    handler: () => bobDb.boxCatalog,
  },
  {
    method: "PATCH",
    pattern: "/api/bob/box/items/:id",
    handler: ({ params, body }) => {
      for (const category of bobDb.boxCatalog) {
        const item = category.items.find((i) => i.id === params.id);
        if (item) {
          if (body.checked !== undefined) item.checked = body.checked;
          if (body.price !== undefined) item.price = body.price;
          if (body.name !== undefined) item.name = body.name;
          return item;
        }
      }
      throw new MockApiError(404, "Articolul nu a fost găsit.");
    },
  },
  {
    method: "POST",
    pattern: "/api/bob/box/items",
    handler: ({ body }) => {
      const category = bobDb.boxCatalog.find((c) => c.key === body.categoryKey);
      if (!category) throw new MockApiError(404, "Categoria nu a fost găsită.");
      const item: BoxItemDto = { id: nextBobId("box"), name: body.name, price: Number(body.price) || 0, checked: true };
      category.items.push(item);
      return item;
    },
  },

  {
    method: "GET",
    pattern: "/api/bob/purchases",
    handler: async () => (await loadPurchaseHistory()).sort((a, b) => b.date.localeCompare(a.date)),
  },
  {
    method: "POST",
    pattern: "/api/bob/purchases",
    // "Cumpărături efectuate" — instantaneu al articolelor bifate ACUM în cutie,
    // salvat persistent (vezi bobHistoryStore.ts). Nu golește/debifează cutia după
    // salvare — luna viitoare pornești de la aceleași bife, ajustezi ce s-a schimbat.
    handler: async ({ body }) => {
      const checkedItems = bobDb.boxCatalog.flatMap((c) => c.items.filter((i) => i.checked));
      if (checkedItems.length === 0) throw new MockApiError(400, "Nicio bifă în cutie — nimic de salvat.");
      const total = Math.round(checkedItems.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
      const record: BobDeliveryRecordDto = {
        id: nextBobId("bobpurchase"),
        date: todayIso(),
        items: checkedItems.map((i) => ({ name: i.name, price: i.price })),
        total,
        note: body?.note?.trim() || null,
      };
      const history = await loadPurchaseHistory();
      history.push(record);
      await savePurchaseHistory(history);
      return record;
    },
  },

  {
    method: "GET",
    pattern: "/api/bob/stats/overview",
    handler: async () => {
      const history = await loadPurchaseHistory();
      const lastDeliveryDate = history.length > 0 ? history.slice().sort((a, b) => b.date.localeCompare(a.date))[0].date : null;
      const activeBeneficiaries = bobDb.beneficiaries.filter((b) => b.status === "Active");
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysUntilNextDelivery = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const currentBoxTotal =
        Math.round(bobDb.boxCatalog.flatMap((c) => c.items.filter((i) => i.checked)).reduce((sum, i) => sum + i.price, 0) * 100) / 100;
      const stats: BobStatsDto = {
        beneficiariesCount: activeBeneficiaries.length,
        maxBudgetPerBox: bobConfig.maxBudgetPerBox,
        daysUntilNextDelivery,
        lastDeliveryDate,
        currentBoxTotal,
        volunteersInvolved: new Set(activeBeneficiaries.map((b) => b.assignedVolunteerName).filter(Boolean)).size,
      };
      return stats;
    },
  },
];

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(pathSegments[i]);
    else if (p !== pathSegments[i]) return null;
  }
  return params;
}

/** Punctul de intrare apelat din client.ts când USE_MOCK_API e true — înlocuiește
 * `fetch`-ul real cu o rutare peste `db`-ul din memorie, păstrând aceeași "formă"
 * de erori (status + mesaj) ca răspunsurile reale ale backend-ului. */
export async function mockRequest(method: string, fullPath: string, body: unknown, token: string | null): Promise<unknown> {
  await delay();

  const [pathname, queryString] = fullPath.split("?");
  const query = new URLSearchParams(queryString ?? "");

  if (method === "POST" && pathname === "/api/auth/login") {
    const { identifier, password } = (body ?? {}) as { identifier?: string; password?: string };
    const trimmed = identifier?.trim() ?? "";
    const normalized = trimmed.toLowerCase();
    const account = db.users.find((u) => u.phone === trimmed || (u.email && u.email.toLowerCase() === normalized));
    // Ordinea contează — parola ÎNAINTE de status, ca să nu dezvăluim starea unui cont
    // cuiva care doar ghicește un telefon/email fără parola corectă (vezi docs/API.md §2).
    if (!account || account.password !== password) throw new MockApiError(401, "Telefon/email sau parolă incorecte.");
    if (account.status === "PendingApproval") throw new MockApiError(401, "Contul tău așteaptă aprobare din partea Nucleului.");
    if (account.status === "Rejected") throw new MockApiError(401, "Cererea ta de acces a fost respinsă.");
    return { token: `mock:${account.id}`, user: publicUser(account) };
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const { fullName, phone, email, password, requestedRole } = (body ?? {}) as {
      fullName?: string;
      phone?: string;
      email?: string;
      password?: string;
      requestedRole?: "Volunteer" | "Nucleus";
    };
    const trimmedName = fullName?.trim() ?? "";
    const trimmedPhone = phone?.trim() || null;
    const trimmedEmail = email?.trim() || null;
    if (!trimmedName) throw new MockApiError(400, "Numele nu poate fi gol.");
    if (!trimmedPhone && !trimmedEmail) throw new MockApiError(400, "Completează cel puțin telefonul sau emailul.");
    if (!password || password.length < 6) throw new MockApiError(400, "Parola trebuie să aibă cel puțin 6 caractere.");
    if (requestedRole !== "Volunteer" && requestedRole !== "Nucleus") throw new MockApiError(400, "Rol invalid.");
    const normalizedEmail = trimmedEmail?.toLowerCase() ?? null;
    const duplicate = db.users.find(
      (u) => (trimmedPhone && u.phone === trimmedPhone) || (normalizedEmail && u.email?.toLowerCase() === normalizedEmail)
    );
    if (duplicate) throw new MockApiError(409, "Există deja un cont cu acest telefon sau email.");
    const account: MockUser = {
      id: nextId("user"),
      fullName: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      role: requestedRole,
      password,
      status: "PendingApproval",
      createdAt: nowIso(),
    };
    db.users.push(account);
    notifyNucleus("NewUserRequest", `Cerere nouă de acces: ${trimmedName} (${requestedRole === "Nucleus" ? "Nucleus" : "Voluntar"}).`, "User", account.id);
    return undefined;
  }

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPattern(route.pattern, pathname);
    if (!params) continue;
    const user = currentUser(token);
    if (route.nucleusOnly) requireNucleus(user);
    return route.handler({ params, query, body }, user);
  }

  throw new MockApiError(404, `Rută necunoscută în modul mock: ${method} ${pathname}`);
}

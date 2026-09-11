import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../theme/tokens";
import { fonts, radius, spacing } from "../theme/tokens";
import { UnitStatus, BookingStatus, MaintenanceTicketStatus, MaintenanceTicketPriority, CleaningTaskStatus, BeneficiaryStatus } from "../api/types";

type Tone = "ok" | "info" | "warn" | "danger";

export const UNIT_STATUS_META: Record<UnitStatus, { label: string; tone: Tone }> = {
  Available: { label: "Liber · igienizat", tone: "ok" },
  Occupied: { label: "Ocupat", tone: "info" },
  NeedsCleaning: { label: "Necesită curățenie", tone: "warn" },
  CleaningInProgress: { label: "Curățenie în curs", tone: "warn" },
  Unavailable: { label: "Indisponibil", tone: "danger" },
};

const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: Tone }> = {
  PendingApproval: { label: "În așteptare", tone: "info" },
  Approved: { label: "Aprobată", tone: "ok" },
  Rejected: { label: "Respinsă", tone: "danger" },
  Active: { label: "Activă", tone: "info" },
  Completed: { label: "Încheiată", tone: "ok" },
  Cancelled: { label: "Anulată", tone: "danger" },
};

export const MAINTENANCE_STATUS_META: Record<MaintenanceTicketStatus, { label: string; tone: Tone }> = {
  New: { label: "Nouă", tone: "warn" },
  Assigned: { label: "Asignată", tone: "info" },
  InProgress: { label: "În lucru", tone: "info" },
  Resolved: { label: "Rezolvată", tone: "ok" },
};

export const MAINTENANCE_PRIORITY_META: Record<MaintenanceTicketPriority, { label: string; tone: Tone }> = {
  Low: { label: "Scăzută", tone: "ok" },
  Medium: { label: "Medie", tone: "info" },
  High: { label: "Ridicată", tone: "warn" },
  Urgent: { label: "Urgentă", tone: "danger" },
};

export const CLEANING_STATUS_META: Record<CleaningTaskStatus, { label: string; tone: Tone }> = {
  Pending: { label: "În așteptare", tone: "warn" },
  InProgress: { label: "În curs", tone: "info" },
  Done: { label: "Finalizată", tone: "ok" },
};

export const BENEFICIARY_STATUS_META: Record<BeneficiaryStatus, { label: string; tone: Tone }> = {
  Active: { label: "Activ", tone: "ok" },
  Blocked: { label: "Blocat", tone: "danger" },
};

export function BeneficiaryStatusPill({ status }: { status: BeneficiaryStatus }) {
  const meta = BENEFICIARY_STATUS_META[status];
  return <Pill label={meta.label} tone={meta.tone} />;
}

export function UnitStatusPill({ status }: { status: UnitStatus }) {
  const meta = UNIT_STATUS_META[status];
  return <Pill label={meta.label} tone={meta.tone} />;
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  return <Pill label={meta.label} tone={meta.tone} />;
}

export function MaintenanceStatusPill({ status }: { status: MaintenanceTicketStatus }) {
  const meta = MAINTENANCE_STATUS_META[status];
  return <Pill label={meta.label} tone={meta.tone} />;
}

export function MaintenancePriorityPill({ priority }: { priority: MaintenanceTicketPriority }) {
  const meta = MAINTENANCE_PRIORITY_META[priority];
  return <Pill label={meta.label} tone={meta.tone} />;
}

export function CleaningStatusPill({ status }: { status: CleaningTaskStatus }) {
  const meta = CLEANING_STATUS_META[status];
  return <Pill label={meta.label} tone={meta.tone} />;
}

export function Pill({ label, tone }: { label: string; tone: Tone }) {
  const colors = useThemeColors();
  const toneColors: Record<Tone, { fg: string; bg: string }> = {
    ok: { fg: colors.ok, bg: colors.okTint },
    info: { fg: colors.info, bg: colors.infoTint },
    warn: { fg: colors.warn, bg: colors.warnTint },
    danger: { fg: colors.danger, bg: colors.dangerTint },
  };
  const { fg, bg } = toneColors[tone];

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12.5 },
});

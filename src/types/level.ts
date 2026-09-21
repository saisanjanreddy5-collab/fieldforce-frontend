import type { Role } from "./auth";

export const RECORD_SCOPES = [
  "own_only",
  "own_and_below",
  "own_below_peers_readonly",
  "whole_region",
  "everything",
] as const;
export type RecordScope = (typeof RECORD_SCOPES)[number];

export interface Level {
  id: string;
  name: string;
  sortOrder: number;
  description: string | null;
  headcountLimit: number | null;
  approvalCeiling: number | null;
  securityTier: Role;
  isCrossCutting: boolean;
  recordScope: RecordScope;
  seesLabelOverride: string | null;
  approvalLabelOverride: string | null;
  canEditLabel: string | null;
  currentHeadcount: number;
  createdAt: string;
}

export interface CreateLevelPayload {
  name: string;
  sortOrder?: number;
  description?: string;
  headcountLimit?: number;
  approvalCeiling?: number;
  securityTier?: Role;
  isCrossCutting?: boolean;
  recordScope?: RecordScope;
  seesLabelOverride?: string;
  approvalLabelOverride?: string;
  canEditLabel?: string;
}

export interface UpdateLevelPayload {
  name?: string;
  sortOrder?: number;
  description?: string;
  headcountLimit?: number | null;
  approvalCeiling?: number | null;
  securityTier?: Role;
  isCrossCutting?: boolean;
  recordScope?: RecordScope;
  seesLabelOverride?: string | null;
  approvalLabelOverride?: string | null;
  canEditLabel?: string | null;
}

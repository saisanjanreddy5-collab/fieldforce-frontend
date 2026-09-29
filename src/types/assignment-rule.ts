export interface AssignmentRule {
  id: string;
  stateId: string | null;
  stateName: string | null;
  category: string | null;
  assignedUserId: string;
  assignedUserName: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAssignmentRulePayload {
  stateId: string;
  category?: string;
  assignedUserId: string;
}

export interface UpdateAssignmentRulePayload {
  category?: string | null;
  assignedUserId?: string;
  isActive?: boolean;
}

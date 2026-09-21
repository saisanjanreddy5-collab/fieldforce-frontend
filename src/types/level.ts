export interface Level {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateLevelPayload {
  name: string;
  sortOrder?: number;
}

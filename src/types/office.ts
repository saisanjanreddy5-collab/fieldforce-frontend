export interface Office {
  id: string;
  name: string;
  region: string | null;
  code: string | null;
  address: string | null;
  zoneId: string | null;
  phone: string | null;
  isActive: boolean;
  employeeCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfficePayload {
  name: string;
  region?: string;
  code?: string;
  address?: string;
  zoneId?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateOfficePayload {
  name?: string;
  region?: string;
  code?: string;
  address?: string;
  zoneId?: string;
  phone?: string;
  isActive?: boolean;
}

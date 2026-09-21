export type OfficeType = "head_office" | "regional_office" | "branch";

export interface Office {
  id: string;
  name: string;
  region: string | null;
  code: string | null;
  type: OfficeType | null;
  address: string | null;
  addressLine2: string | null;
  city: string | null;
  pincode: string | null;
  zoneId: string | null;
  stateId: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
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
  type?: OfficeType;
  address?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
  zoneId?: string;
  stateId?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

export interface UpdateOfficePayload {
  name?: string;
  region?: string;
  code?: string;
  type?: OfficeType;
  address?: string;
  addressLine2?: string;
  city?: string;
  pincode?: string;
  zoneId?: string;
  stateId?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
}

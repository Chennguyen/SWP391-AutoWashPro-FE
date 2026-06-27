export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  cccd: string;
  faceImages: File[];
}

export interface RegisterResult {
  message?: string;
  userId?: string;
}

export interface LoginResult {
  success: boolean;
  message: string;
  data: {
    access_token?: string;
    Access_token?: string;
    accessToken?: string;
    isVerify?: boolean;
  } | null;
}

export type JwtPayload = {
  Role?: string;
  role?: string;
  email?: string;
  sub?: string;
  nameid?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"?: string;
};

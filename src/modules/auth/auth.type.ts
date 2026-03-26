export interface JwtPayload {
  id: string;
  role: "admin" | "hr" | "user";
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
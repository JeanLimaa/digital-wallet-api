export interface UserPayload {
    name: string;
    email: string;
    id: string;
    iat?: number;
    exp?: number;
}
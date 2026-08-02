export type Role = "user" | "assistant" | "tool" | "developer" | "system";

export interface IMessage {
    role:Role,
    content:string
}

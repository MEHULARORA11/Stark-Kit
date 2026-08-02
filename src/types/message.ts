export type Role = "user" | "assistant" | "tool" | "developer";

export interface IMessage {
    role:Role,
    content:string
}

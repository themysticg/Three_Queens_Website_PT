import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    discordId?: string;
    isAdmin?: boolean;
  }

  interface Session {
    user: User & {
      id: string;
      discordId: string;
      isAdmin: boolean;
    };
  }
}

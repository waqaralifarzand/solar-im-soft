import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      role: Role;
      companyId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    companyId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    companyId: string | null;
  }
}

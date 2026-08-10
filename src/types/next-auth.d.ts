import type { DefaultSession } from "next-auth";
import type { RolUsuario } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rol: RolUsuario;
      complejoIds: string[];
    } & DefaultSession["user"];
  }

  interface User {
    rol: RolUsuario;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    rol: RolUsuario;
    complejoIds: string[];
  }
}

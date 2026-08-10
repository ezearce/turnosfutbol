import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RolUsuario } from "@/generated/prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario) return null;

        const ok = await bcrypt.compare(password, usuario.passwordHash);
        if (!ok) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          rol: usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id!;
        token.rol = (user as { rol: RolUsuario }).rol;
        // Complejos que administra este usuario (para el aislamiento multi-tenant).
        const membresias = await prisma.complejoUsuario.findMany({
          where: { usuarioId: user.id! },
          select: { complejoId: true },
        });
        token.complejoIds = membresias.map((m) => m.complejoId);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.rol = token.rol as RolUsuario;
        session.user.complejoIds = (token.complejoIds as string[]) ?? [];
      }
      return session;
    },
  },
});

import { NuxtAuthHandler } from '#auth'
import bcrypt from 'bcrypt'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '~~/server/db'

export default NuxtAuthHandler({
  secret: useRuntimeConfig().authSecret,
  pages: {
    signIn: '/login',
  },
  providers: [
    // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
    CredentialsProvider.default({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          // Check if user exists in database
          const user = await db
            .selectFrom('users')
            .select(['id', 'username', 'password', 'email', 'name'])
            .where('username', '=', credentials.username)
            .executeTakeFirst()

          if (!user) {
            // Check if credentials match environment variables (for initial login)
            const config = useRuntimeConfig()
            if (credentials.username === config.USER && credentials.password === config.PASS) {
              // Create user in database
              const hashedPassword = await bcrypt.hash(credentials.password, 10)
              const newUser = await db
                .insertInto('users')
                .values({
                  username: credentials.username,
                  password: hashedPassword,
                  email: null,
                  name: credentials.username,
                  lastLoginAt: new Date().toISOString(),
                })
                .returning(['id', 'username', 'email', 'name'])
                .executeTakeFirstOrThrow()

              return {
                id: String(newUser.id),
                name: newUser.name,
                email: newUser.email,
                username: newUser.username,
              }
            }
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            return null
          }

          // Update last login time
          await db
            .updateTable('users')
            .set({
              lastLoginAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .where('id', '=', user.id)
            .execute()

          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            username: user.username,
          }
        }
        catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).username = token.username
      }
      return session
    },
  },
})

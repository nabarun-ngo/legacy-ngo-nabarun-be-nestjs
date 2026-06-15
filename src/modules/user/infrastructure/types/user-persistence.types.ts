import { Prisma } from "@prisma/client";

/**
 * Persistence layer types for User aggregate
 * These represent the actual database query results from Prisma
 */
export namespace UserPersistence {
  /**
   * Full user with all relations loaded
   * Use when you need complete user data
   */
  export type Full = Prisma.UserProfileGetPayload<{
    include: {
      roles: true;
      phoneNumbers: true;
      addresses: true;
      socialMediaLinks: true;
    };
  }>;

  /**
   * User with only roles
   * Use for authorization checks or list views
   */
  export type WithRoles = Prisma.UserProfileGetPayload<{
    include: {
      roles: true;
    };
  }>;

  /**
   * User with authentication-related data
   * Use for login/auth flows
   */
  export type WithAuth = Prisma.UserProfileGetPayload<{
    include: {
      roles: true;
      phoneNumbers: true;
    };
  }>;

  /**
   * Basic user without relations
   * Use for simple queries or when relations aren't needed
   */
  export type Basic = Prisma.UserProfileGetPayload<{
    include: {};
  }>;

  /**
   * Union type for any user query result
   */
  export type Any = Full | WithRoles | WithAuth | Basic;
}

/**
 * Role persistence types
 */
export namespace RolePersistence {
  export type Full = Prisma.UserRoleGetPayload<{
    include: {
      user: true;
    };
  }>;

  export type Basic = Prisma.UserRoleGetPayload<{
    include: {};
  }>;
}

/**
 * Helper type to extract relations from a payload
 */
export type ExtractRelations<T> = {
  [K in keyof T]: T[K] extends Array<any> ? T[K] : never;
};

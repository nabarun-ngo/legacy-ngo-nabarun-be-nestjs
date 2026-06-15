import { UserPersistence } from "./types/user-persistence.types";

/**
 * Type-safe helper functions specifically for User aggregate mapping
 * All methods maintain full type safety by using explicit Prisma types
 */
export class UserMapperHelpers {
  /**
   * Extract phone numbers from user model with type safety
   * Handles both Full and WithRoles types correctly
   */
  static extractPhoneNumbers(
    model:
      | UserPersistence.Full
      | UserPersistence.WithRoles
      | UserPersistence.WithAuth,
  ): {
    primary: NonNullable<UserPersistence.Full["phoneNumbers"]>[number] | null;
    secondary: NonNullable<UserPersistence.Full["phoneNumbers"]>[number] | null;
  } {
    const phoneNumbers =
      "phoneNumbers" in model && Array.isArray(model.phoneNumbers)
        ? model.phoneNumbers
        : [];

    const primary = phoneNumbers.find((p) => p.primary) ?? null;
    const secondary = phoneNumbers.find((p) => !p.primary) ?? null;

    return { primary, secondary };
  }

  /**
   * Extract addresses from user model with type safety
   * Returns present and permanent addresses separately
   */
  static extractAddresses(
    model:
      | UserPersistence.Full
      | UserPersistence.WithRoles
      | UserPersistence.WithAuth,
  ): {
    present: NonNullable<UserPersistence.Full["addresses"]>[number] | null;
    permanent: NonNullable<UserPersistence.Full["addresses"]>[number] | null;
  } {
    const addresses =
      "addresses" in model && Array.isArray(model.addresses)
        ? model.addresses
        : [];

    const present = addresses.find((a) => a.addressType === "present") ?? null;
    const permanent =
      addresses.find((a) => a.addressType === "permanent") ?? null;

    return { present, permanent };
  }

  /**
   * Extract social media links from user model with type safety
   */
  static extractSocialLinks(
    model:
      | UserPersistence.Full
      | UserPersistence.WithRoles
      | UserPersistence.WithAuth,
  ): NonNullable<UserPersistence.Full["socialMediaLinks"]> {
    return "socialMediaLinks" in model && Array.isArray(model.socialMediaLinks)
      ? model.socialMediaLinks
      : [];
  }

  /**
   * Extract roles from user model with type safety
   * All user persistence types have roles
   */
  static extractRoles(
    model:
      | UserPersistence.Full
      | UserPersistence.WithRoles
      | UserPersistence.WithAuth,
  ): NonNullable<UserPersistence.Full["roles"]> {
    return model.roles ?? [];
  }

  /**
   * Type-safe check if model has full relations
   */
  static hasFullRelations(
    model:
      | UserPersistence.Full
      | UserPersistence.WithRoles
      | UserPersistence.WithAuth,
  ): model is UserPersistence.Full {
    return (
      "phoneNumbers" in model &&
      "addresses" in model &&
      "socialMediaLinks" in model
    );
  }

  /**
   * Type-safe check if model has auth relations
   */
  static hasAuthRelations(
    model:
      | UserPersistence.Full
      | UserPersistence.WithRoles
      | UserPersistence.WithAuth,
  ): model is UserPersistence.WithAuth | UserPersistence.Full {
    return "phoneNumbers" in model;
  }
}

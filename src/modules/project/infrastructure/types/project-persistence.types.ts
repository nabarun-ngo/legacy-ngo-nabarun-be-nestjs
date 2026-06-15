import { Prisma } from "@prisma/client";

export namespace ProjectPersistence {
  export type Base = Prisma.ProjectGetPayload<{
    include: {
      manager: true;
      sponsor: true;
    };
  }>;
}

export namespace ActivityPersistence {
  export type Base = Prisma.ActivityGetPayload<{
    include: {
      project: true;
      assignee: true;
      organizer: true;
      parentActivity: true;
    };
  }>;
}

export namespace BeneficiaryPersistence {
  export type Base = Prisma.BeneficiaryGetPayload<{
    include: {
      project: true;
    };
  }>;
}

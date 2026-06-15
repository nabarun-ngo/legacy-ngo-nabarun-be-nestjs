import { IRepository } from "src/shared/interfaces/repository.interface";
import { Role } from "../model/role.model";
import { User,UserFilterProps } from "../model/user.model";

export interface IUserRepository
  extends IRepository<User, string, UserFilterProps> {
  findByEmail(email: string): Promise<User | null>;
  updateRoles(id: string, roles: Role[]): Promise<void>;
  restore(id: string): Promise<void>;
  findUserMetrics(id: string): Promise<{
    pendingDonations: number;
    unsettledExpense: number;
    pendingTask: number;
    walletBalance: number;
  }>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

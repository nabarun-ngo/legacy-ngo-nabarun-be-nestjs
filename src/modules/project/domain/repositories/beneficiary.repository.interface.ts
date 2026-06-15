import { IRepository } from "src/shared/interfaces/repository.interface";
import {
Beneficiary,
BeneficiaryFilterProps,
} from "../model/beneficiary.model";

export interface IBeneficiaryRepository
  extends IRepository<Beneficiary, string, BeneficiaryFilterProps> {
  findById(id: string): Promise<Beneficiary | null>;
  findByProjectId(projectId: string): Promise<Beneficiary[]>;
  findByStatus(status: string): Promise<Beneficiary[]>;
  findByType(type: string): Promise<Beneficiary[]>;
  create(beneficiary: Beneficiary): Promise<Beneficiary>;
  update(id: string, beneficiary: Beneficiary): Promise<Beneficiary>;
  delete(id: string): Promise<void>;
  findAll(filter?: BeneficiaryFilterProps): Promise<Beneficiary[]>;
}

export const BENEFICIARY_REPOSITORY = Symbol("BENEFICIARY_REPOSITORY");

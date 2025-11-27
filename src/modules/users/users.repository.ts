import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely } from 'kysely';
import { randomUUID } from 'crypto';
import { DB } from '../../database/types';

export interface CreateUserDto {
  phoneNumber: string;
  businessName: string;
  contactPerson: string;
  email: string;
  address: string;
  natureOfBusiness: string;
  registrationNumber: string;
}

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(@Inject('DB_CONNECTION') private readonly db: Kysely<DB>) {}

  async findByPhoneNumber(phoneNumber: string) {
    try {
      return await this.db
        .selectFrom('users')
        .selectAll()
        .where('phoneNumber', '=', phoneNumber)
        .executeTakeFirst();
    } catch (error) {
      this.logger.error(
        `Database connection error while finding user by phone: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByEmail(email: string) {
    try {
      return await this.db
        .selectFrom('users')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst();
    } catch (error) {
      this.logger.error(
        `Database connection error while finding user by email: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async create(data: CreateUserDto) {
    try {
      return await this.db
        .insertInto('users')
        .values({
          id: randomUUID(),
          phoneNumber: data.phoneNumber,
          businessName: data.businessName,
          contactPerson: data.contactPerson,
          email: data.email,
          address: data.address,
          natureOfBusiness: data.natureOfBusiness,
          registrationNumber: data.registrationNumber,
          updatedAt: new Date(),
        })
        .execute();
    } catch (error) {
      this.logger.error(
        `Database connection error while creating user: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async existsByPhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      const result = await this.db
        .selectFrom('users')
        .select('id')
        .where('phoneNumber', '=', phoneNumber)
        .executeTakeFirst();
      return !!result;
    } catch (error) {
      this.logger.error(
        `Database connection error while checking user existence: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Return false on connection error to allow processing to continue
      // The service will handle this gracefully
      throw error;
    }
  }
}

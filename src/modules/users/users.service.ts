import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository, CreateUserDto } from './users.repository';
import { RedisService } from '../../core/redis/redis.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly CACHE_TTL = 3600;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly redisService: RedisService,
  ) {}

  async checkUserExists(phoneNumber: string): Promise<boolean> {
    const cacheKey = `user:${phoneNumber}`;

    try {
      const cachedUser = await this.redisService.get(cacheKey);

      if (cachedUser !== null) {
        return cachedUser === 'true';
      }

      try {
        const exists =
          await this.usersRepository.existsByPhoneNumber(phoneNumber);
        await this.redisService.set(cacheKey, String(exists), this.CACHE_TTL);
        return exists;
      } catch (dbError) {
        this.logger.warn(
          `Database unavailable, treating user as new: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error checking user existence: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  async createUser(data: CreateUserDto): Promise<void> {
    try {
      await this.usersRepository.create(data);
      const cacheKey = `user:${data.phoneNumber}`;
      await this.redisService.set(cacheKey, 'true', this.CACHE_TTL);
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByEmail(email: string) {
    try {
      return await this.usersRepository.findByEmail(email);
    } catch (error) {
      this.logger.error(
        `Failed to find user by email: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async findByPhoneNumber(phoneNumber: string) {
    try {
      return await this.usersRepository.findByPhoneNumber(phoneNumber);
    } catch (error) {
      this.logger.error(
        `Failed to find user by phone number: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}

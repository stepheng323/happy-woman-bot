import { Injectable, Logger } from '@nestjs/common';
import { DecryptedRequest, FlowResponse } from '../types/flow.types';
import { UsersService } from '../../../users/users.service';
import { FlowTokenService } from '../services/flow-token.service';
import { FlowMessagingService } from '../services/flow-messaging.service';

@Injectable()
export class AdditionalInfoHandler {
  private readonly logger = new Logger(AdditionalInfoHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly flowTokenService: FlowTokenService,
    private readonly flowMessagingService: FlowMessagingService,
  ) {}

  async handle(request: DecryptedRequest): Promise<FlowResponse> {
    const action = (request as Record<string, unknown>).action as
      | string
      | undefined;

    this.logger.log('Handling ADDITIONAL_INFO screen', {
      data: request.data,
      screen: request.screen,
      action: action,
      allRequestKeys: Object.keys(request),
    });

    const data = request.data || {};
    const isInitialLoad = !action && (!data || Object.keys(data).length === 0);

    if (isInitialLoad) {
      this.logger.debug(
        'Initial ADDITIONAL_INFO screen load - returning screen with data from BASIC_INFO',
      );

      return {
        version: request.version,
        screen: request.screen,
        data: data,
      };
    }

    if (action !== 'data_exchange') {
      this.logger.debug(
        'Action is not data_exchange, returning current screen',
      );
      return {
        version: request.version,
        screen: request.screen,
        data: data,
      };
    }

    const errors: Record<string, string> = {};

    const phoneNumber = this.flowTokenService.extractPhoneNumberFromToken(
      request.flow_token,
    );

    if (!phoneNumber) {
      this.logger.error('Cannot extract phone number from flow_token');
      return {
        version: request.version,
        screen: request.screen,
        data: {
          ...data,
          errors: {
            _general: 'Unable to identify user. Please try again.',
          },
        },
      };
    }

    const businessName =
      typeof data.business_name === 'string' ? data.business_name.trim() : '';
    const contactPerson =
      typeof data.contact_person === 'string' ? data.contact_person.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim() : '';

    const businessAddress =
      typeof data.business_address === 'string'
        ? data.business_address.trim()
        : '';
    const natureOfBusiness =
      typeof data.nature_of_business === 'string'
        ? data.nature_of_business.trim()
        : '';
    const registrationNumber =
      typeof data.registration_number === 'string'
        ? data.registration_number.trim()
        : '';

    if (!businessName) {
      errors.business_name = 'Business name is required';
    } else if (businessName.length < 2) {
      errors.business_name = 'Business name must be at least 2 characters';
    }

    if (!contactPerson) {
      errors.contact_person = 'Contact person name is required';
    } else if (contactPerson.length < 2) {
      errors.contact_person = 'Name must be at least 2 characters';
    }

    if (!email) {
      errors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = 'Please enter a valid email address';
      } else {
        const existingEmail = await this.usersService.findByEmail(email);
        if (existingEmail) {
          errors.email = 'This email is already registered';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      this.logger.debug('Validation errors found', { errors });
      return {
        version: request.version,
        screen: request.screen,
        data: {
          ...data,
          errors,
        },
      };
    }

    this.logger.log('All data validated, creating user', {
      phoneNumber,
      businessName,
      contactPerson,
      email,
      businessAddress,
      natureOfBusiness,
      registrationNumber,
    });

    try {
      await this.usersService.createUser({
        phoneNumber,
        businessName,
        contactPerson,
        email,
        address: businessAddress,
        natureOfBusiness,
        registrationNumber,
      });

      this.logger.log(`User created successfully: ${phoneNumber}`);

      const version =
        typeof request.version === 'string'
          ? request.version
          : String(request.version || '3.0');

      this.flowMessagingService
        .sendOnboardingSuccessMessages(phoneNumber)
        .catch((error) => {
          this.logger.error(
            `Failed to send success messages: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      return {
        version: version,
        screen: 'SUCCESS',
        data: {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        version: request.version,
        screen: request.screen,
        data: {
          ...data,
          errors: {
            _general:
              'An error occurred while saving your details. Please try again.',
          },
        },
      };
    }
  }
}
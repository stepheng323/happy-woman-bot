import { Injectable, Logger } from '@nestjs/common';
import { DecryptedRequest, FlowResponse } from '../types/flow.types';
import { UsersService } from '../../../users/users.service';
import { FlowTokenService } from '../services/flow-token.service';

@Injectable()
export class BasicInfoHandler {
  private readonly logger = new Logger(BasicInfoHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly flowTokenService: FlowTokenService,
  ) {}

  async handle(request: DecryptedRequest): Promise<FlowResponse> {
    const action = (request as Record<string, unknown>).action as
      | string
      | undefined;
    const data = request.data || {};

    this.logger.log('Handling BASIC_INFO screen', {
      data: data,
      screen: request.screen,
      action: action,
      dataKeys: Object.keys(data),
      allRequestKeys: Object.keys(request),
    });

    const isInitialLoad = !action && (!data || Object.keys(data).length === 0);

    if (isInitialLoad) {
      this.logger.debug(
        'Initial screen load - checking if user already exists',
      );

      try {
        const phoneNumber = this.flowTokenService.extractPhoneNumberFromToken(
          request.flow_token,
        );

        if (phoneNumber) {
          const userExists =
            await this.usersService.checkUserExists(phoneNumber);
          if (userExists) {
            this.logger.log(
              `User ${phoneNumber} already exists, redirecting to SUCCESS screen`,
            );
            return {
              version: request.version,
              screen: 'SUCCESS',
              data: {
                extension_message_response: {
                  params: {
                    flow_token: request.flow_token,
                    status: 'COMPLETE',
                  },
                },
              },
            };
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to check user existence during initial load: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue with normal flow if check fails
      }

      this.logger.debug(
        'User not found or check failed - returning empty screen',
      );
      return {
        version: request.version,
        screen: request.screen,
        data: {},
      };
    }

    if (
      action === 'data_exchange' &&
      (!data || Object.keys(data).length === 0)
    ) {
      this.logger.warn(
        'data_exchange action received but data is empty - form data may not have been sent correctly. Ensure Flow JSON wraps inputs in a Form component.',
      );
    }

    this.logger.debug('Processing form data for validation', {
      data,
      dataKeys: Object.keys(data),
      dataValues: data,
    });

    const errors: Record<string, string> = {};

    const businessName =
      typeof data.business_name === 'string' ? data.business_name.trim() : '';
    if (!businessName) {
      errors.business_name = 'Business name is required';
    } else if (businessName.length < 2) {
      errors.business_name = 'Business name must be at least 2 characters';
    }

    const contactPerson =
      typeof data.contact_person === 'string' ? data.contact_person.trim() : '';
    if (!contactPerson) {
      errors.contact_person = 'Contact person name is required';
    } else if (contactPerson.length < 2) {
      errors.contact_person = 'Name must be at least 2 characters';
    }

    const email = typeof data.email === 'string' ? data.email.trim() : '';
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

    this.logger.log(
      'Basic info validated successfully, navigating to ADDITIONAL_INFO',
      {
        businessName,
        contactPerson,
        email,
      },
    );

    return {
      version: request.version,
      screen: 'ADDITIONAL_INFO',
      data: {
        business_name: businessName,
        contact_person: contactPerson,
        email: email,
      },
    };
  }
}

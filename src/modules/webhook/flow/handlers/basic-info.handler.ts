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

    // When user first loads the screen, data is empty - just return the screen
    // When user clicks "Next" with data_exchange, WhatsApp should send form data in request.data
    // If data is empty and action is data_exchange, it means form wasn't filled or data wasn't sent

    // Check if this is an initial load (no action, empty data)
    const isInitialLoad = !action && (!data || Object.keys(data).length === 0);

    if (isInitialLoad) {
      this.logger.debug('Initial screen load - returning empty screen');
      return {
        version: request.version,
        screen: request.screen,
        data: {},
      };
    }

    // For data_exchange action, the form data should be in request.data
    // If it's still empty, log a warning but proceed with validation
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

    // Extract and validate business name (required field)
    const businessName =
      typeof data.business_name === 'string' ? data.business_name.trim() : '';
    if (!businessName) {
      errors.business_name = 'Business name is required';
    } else if (businessName.length < 2) {
      errors.business_name = 'Business name must be at least 2 characters';
    }

    // Extract and validate contact person (required field)
    const contactPerson =
      typeof data.contact_person === 'string' ? data.contact_person.trim() : '';
    if (!contactPerson) {
      errors.contact_person = 'Contact person name is required';
    } else if (contactPerson.length < 2) {
      errors.contact_person = 'Name must be at least 2 characters';
    }

    // Extract and validate email (required field)
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

    // If there are validation errors, return them (stay on current screen)
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

    // All validation passed - navigate to next screen
    this.logger.log(
      'Basic info validated successfully, navigating to ADDITIONAL_INFO',
      {
        businessName,
        contactPerson,
        email,
      },
    );

    // Return response to navigate to ADDITIONAL_INFO screen
    // Pass validated data to the next screen
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

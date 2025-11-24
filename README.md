# Happy Woman Bot

A production-ready WhatsApp bot built with NestJS, featuring webhook handling, message processing, and automated responses.

## Features

- 🤖 **WhatsApp Webhook Integration** - Receive and process WhatsApp messages
- 🔄 **WhatsApp Flow Support** - Handle interactive Flow experiences with encryption/decryption
- ✅ **Zod Validation** - Type-safe validation with `nestjs-zod`
- 📝 **Swagger Documentation** - Auto-generated API docs
- 🏥 **Health Checks** - Ready, live, and health endpoints
- 🔧 **Environment Configuration** - Centralized config with validation
- 🎯 **Modular Architecture** - Clean separation of concerns
- 🚀 **Production Ready** - Best practices and error handling

## Tech Stack

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod) - Zod integration for NestJS
- [Swagger](https://swagger.io/) - API documentation
- TypeScript - Type-safe development

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- WhatsApp Business API credentials from [Meta for Developers](https://developers.facebook.com/)

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
```

## Configuration

Edit `.env` file with your WhatsApp credentials. **All WhatsApp credentials are required**:

```env
# Application
NODE_ENV=development
PORT=3000

# API
API_PREFIX=api
API_VERSION=v1

# WhatsApp Configuration (REQUIRED)
# Get these from https://developers.facebook.com/apps
WHATSAPP_VERIFY_TOKEN=your_verify_token_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_URL=https://graph.facebook.com/v21.0

# WhatsApp Flow Configuration (OPTIONAL - only if using Flow)
# Provide at least one of the following private key sources:
# META_FLOW_PRIVATE_KEY_BASE64=base64_encoded_private_key
# META_FLOW_PRIVATE_KEY_PATH=/path/to/private/key.pem
# META_FLOW_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# META_FLOW_PRIVATE_KEY_PASSPHRASE=optional_passphrase

# CORS
CORS_ORIGIN=*
```

**Note:** The application will fail to start if WhatsApp credentials are not provided, as they are required for the bot to function. Flow credentials are optional and only needed if you're using WhatsApp Flow.

### Getting WhatsApp Credentials

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add WhatsApp product to your app
4. Get your:
   - **Access Token** - From the app dashboard
   - **Phone Number ID** - From WhatsApp > API Setup
   - **Verify Token** - Create your own secure token

## Running the App

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

## API Endpoints

### Webhook Endpoints

- `GET /api/v1/webhook` - Verify webhook (WhatsApp verification)
- `POST /api/v1/webhook` - Receive WhatsApp messages

### Flow Endpoints

- `POST /api/v1/flow` - Handle WhatsApp Flow requests (encrypted/decrypted)

### Health Check Endpoints

- `GET /api/v1/health` - Health check
- `GET /api/v1/health/ready` - Readiness check
- `GET /api/v1/health/live` - Liveness check

### Documentation

- `GET /api/v1/docs` - Swagger UI (development only)

## Setting Up WhatsApp Webhook

1. Deploy your application to a public URL (e.g., using ngrok for local development)
2. Go to your Meta App Dashboard > WhatsApp > Configuration
3. Set the webhook URL: `https://your-domain.com/api/v1/webhook`
4. Set the verify token to match your `WHATSAPP_VERIFY_TOKEN`
5. Subscribe to `messages` field

### Local Development with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run start:dev

# In another terminal, expose your local server
ngrok http 3000

# Use the ngrok URL in your WhatsApp webhook configuration
```

## Project Structure

```
src/
├── config/           # Configuration and environment validation
├── webhook/          # Webhook controller and message processing
│   ├── dto/         # Zod schemas and DTOs
│   ├── webhook.controller.ts
│   └── message-processor.service.ts
├── whatsapp/         # WhatsApp API service
├── health/           # Health check endpoints
├── app.module.ts     # Root module
└── main.ts           # Application bootstrap
```

## Message Processing

The bot currently handles:

- **Text messages** - Responds to "hello", "hi", "help" commands
- **Media messages** - Images, audio, video, documents
- **Location messages** - Acknowledges location sharing

Customize the message processing logic in `src/webhook/message-processor.service.ts`.

## WhatsApp Flow

The bot includes support for WhatsApp Flow, which allows you to create interactive experiences. The Flow endpoint:

- **Decrypts** incoming Flow requests using RSA private key
- **Processes** the Flow data based on screen type
- **Encrypts** responses using AES-128-GCM

### Setting Up Flow

1. Get your Flow private key from Meta for Developers
2. Configure one of the Flow private key environment variables:
   - `META_FLOW_PRIVATE_KEY_BASE64` - Base64 encoded key
   - `META_FLOW_PRIVATE_KEY_PATH` - Path to key file
   - `META_FLOW_PRIVATE_KEY_PEM` - PEM formatted key string
3. Customize Flow processing in `src/flow/flow-processor.service.ts`

The Flow endpoint automatically handles encryption/decryption using the provided private key.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Linting & Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Build the application: `npm run build`
3. Start with: `npm run start:prod`
4. Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/main.js --name happy-woman-bot
```

## Environment Variables

All environment variables are validated using Zod schemas. See `src/config/env.schema.ts` for the complete schema.

## License

UNLICENSED

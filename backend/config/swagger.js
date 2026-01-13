/**
 * Swagger/OpenAPI Configuration
 * 
 * Provides API documentation for the Egypt Payment Production - Phase 1 endpoints.
 * Includes top-up routes, admin verification routes, and platform wallet management.
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Matrix Delivery API - Egypt Payment System',
      version: '1.0.0',
      description: `
## Egypt Payment Production - Phase 1 API Documentation

This API documentation covers Phase 1 of the Egypt Payment Production system:
- **Balance Top-Up**: Smart Wallets (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay) and InstaPay
- **Admin Verification**: Manual verification of top-up requests
- **Platform Wallet Management**: Admin management of receiving wallets

### Authentication
All endpoints require authentication via httpOnly JWT cookie. Login first at \`POST /api/auth/login\` to obtain the cookie.

### Rate Limiting
Top-up endpoints are rate-limited to 10 requests per minute per user.

### Amount Limits
- Minimum top-up: 10 EGP
- Maximum top-up: 10,000 EGP
      `,
      contact: {
        name: 'Matrix Delivery Team',
        email: 'support@matrixdelivery.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.matrixdelivery.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Top-Up',
        description: 'User top-up operations for Egypt payment methods'
      },
      {
        name: 'Admin Top-Up',
        description: 'Admin verification and management of top-up requests'
      },
      {
        name: 'Platform Wallets',
        description: 'Admin management of platform receiving wallets'
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT token stored in httpOnly cookie. Login at POST /api/auth/login to obtain.'
        }
      },
      schemas: {
        // Top-up schemas
        Topup: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique top-up ID',
              example: 1
            },
            userId: {
              type: 'string',
              description: 'User ID who created the top-up',
              example: 'user_abc123'
            },
            amount: {
              type: 'number',
              format: 'float',
              description: 'Top-up amount in EGP',
              minimum: 10,
              maximum: 10000,
              example: 100.00
            },
            paymentMethod: {
              type: 'string',
              enum: ['vodafone_cash', 'orange_money', 'etisalat_cash', 'we_pay', 'instapay'],
              description: 'Payment method used',
              example: 'vodafone_cash'
            },
            transactionReference: {
              type: 'string',
              description: 'Transaction reference from payment provider',
              example: 'TXN123456789'
            },
            platformWalletId: {
              type: 'integer',
              nullable: true,
              description: 'Platform wallet ID used for this top-up',
              example: 1
            },
            status: {
              type: 'string',
              enum: ['pending', 'verified', 'rejected'],
              description: 'Current status of the top-up',
              example: 'pending'
            },
            rejectionReason: {
              type: 'string',
              nullable: true,
              description: 'Reason for rejection (if rejected)',
              example: null
            },
            verifiedBy: {
              type: 'string',
              nullable: true,
              description: 'Admin ID who verified/rejected',
              example: null
            },
            verifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Timestamp of verification/rejection',
              example: null
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
              example: '2026-01-13T10:30:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2026-01-13T10:30:00Z'
            }
          }
        },
        CreateTopupRequest: {
          type: 'object',
          required: ['amount', 'paymentMethod', 'transactionReference'],
          properties: {
            amount: {
              type: 'number',
              format: 'float',
              minimum: 10,
              maximum: 10000,
              description: 'Top-up amount in EGP (10-10000)',
              example: 100.00
            },
            paymentMethod: {
              type: 'string',
              enum: ['vodafone_cash', 'orange_money', 'etisalat_cash', 'we_pay', 'instapay'],
              description: 'Payment method used for the transfer',
              example: 'vodafone_cash'
            },
            transactionReference: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Transaction reference from payment provider',
              example: 'TXN123456789'
            },
            platformWalletId: {
              type: 'integer',
              nullable: true,
              description: 'Optional: specific platform wallet ID',
              example: 1
            }
          }
        },
        TopupFilters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'verified', 'rejected'],
              description: 'Filter by status'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Filter from date (ISO format)',
              example: '2026-01-01'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Filter to date (ISO format)',
              example: '2026-01-31'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Number of results per page'
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              description: 'Offset for pagination'
            }
          }
        },
        // Platform Wallet schemas
        PlatformWallet: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique wallet ID',
              example: 1
            },
            paymentMethod: {
              type: 'string',
              enum: ['vodafone_cash', 'orange_money', 'etisalat_cash', 'we_pay', 'instapay'],
              description: 'Payment method type',
              example: 'vodafone_cash'
            },
            phoneNumber: {
              type: 'string',
              nullable: true,
              description: 'Wallet phone number (for smart wallets)',
              example: '01012345678'
            },
            instapayAlias: {
              type: 'string',
              nullable: true,
              description: 'InstaPay alias (for InstaPay)',
              example: 'matrix@instapay'
            },
            holderName: {
              type: 'string',
              description: 'Account holder name',
              example: 'Matrix Delivery'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether wallet is active',
              example: true
            },
            dailyLimit: {
              type: 'number',
              format: 'float',
              description: 'Daily transaction limit',
              example: 50000.00
            },
            monthlyLimit: {
              type: 'number',
              format: 'float',
              description: 'Monthly transaction limit',
              example: 500000.00
            },
            dailyUsed: {
              type: 'number',
              format: 'float',
              description: 'Amount used today',
              example: 1500.00
            },
            monthlyUsed: {
              type: 'number',
              format: 'float',
              description: 'Amount used this month',
              example: 25000.00
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        CreateWalletRequest: {
          type: 'object',
          required: ['paymentMethod', 'holderName'],
          properties: {
            paymentMethod: {
              type: 'string',
              enum: ['vodafone_cash', 'orange_money', 'etisalat_cash', 'we_pay', 'instapay'],
              description: 'Payment method type'
            },
            phoneNumber: {
              type: 'string',
              maxLength: 20,
              description: 'Required for smart wallets',
              example: '01012345678'
            },
            instapayAlias: {
              type: 'string',
              maxLength: 100,
              description: 'Required for InstaPay',
              example: 'matrix@instapay'
            },
            holderName: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Account holder name',
              example: 'Matrix Delivery'
            },
            dailyLimit: {
              type: 'number',
              default: 50000,
              description: 'Daily transaction limit'
            },
            monthlyLimit: {
              type: 'number',
              default: 500000,
              description: 'Monthly transaction limit'
            }
          }
        },
        UpdateWalletRequest: {
          type: 'object',
          properties: {
            phoneNumber: {
              type: 'string',
              maxLength: 20,
              nullable: true
            },
            instapayAlias: {
              type: 'string',
              maxLength: 100,
              nullable: true
            },
            holderName: {
              type: 'string',
              minLength: 1,
              maxLength: 100
            },
            dailyLimit: {
              type: 'number'
            },
            monthlyLimit: {
              type: 'number'
            },
            isActive: {
              type: 'boolean'
            }
          }
        },
        // Error schemas
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Minimum top-up amount is 10 EGP'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        DuplicateError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'This transaction was already submitted'
            },
            code: {
              type: 'string',
              example: 'DUPLICATE_REFERENCE'
            },
            existingStatus: {
              type: 'string',
              enum: ['pending', 'verified', 'rejected'],
              description: 'Status of the existing top-up request'
            }
          }
        },
        RateLimitError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Too many requests. Please wait.'
            },
            code: {
              type: 'string',
              example: 'RATE_LIMITED'
            },
            retryAfter: {
              type: 'integer',
              description: 'Seconds until rate limit resets',
              example: 60
            }
          }
        },
        UnauthorizedError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Authentication required'
            }
          }
        },
        NotFoundError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Top-up not found'
            }
          }
        },
        // Pagination schema
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of records'
            },
            limit: {
              type: 'integer',
              description: 'Records per page'
            },
            offset: {
              type: 'integer',
              description: 'Current offset'
            },
            hasMore: {
              type: 'boolean',
              description: 'Whether more records exist'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required - JWT cookie missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UnauthorizedError'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error - invalid request data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded - too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitError'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NotFoundError'
              }
            }
          }
        }
      }
    },
    security: [
      {
        cookieAuth: []
      }
    ]
  },
  apis: [
    './routes/topups.js',
    './routes/adminTopups.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI middleware
 * @param {Express} app - Express application instance
 */
function setupSwagger(app) {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Matrix Delivery API - Egypt Payment Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true
    }
  }));

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = {
  swaggerSpec,
  setupSwagger
};

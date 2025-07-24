export class MCPError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.details = details;
  }
}

export function createErrorResponse(error) {
  console.error('MCP Error:', error);

  let message = 'An unexpected error occurred';
  let code = 'INTERNAL_ERROR';

  if (error instanceof MCPError) {
    message = error.message;
    code = error.code;
  } else if (error.message.includes('Facebook API Error')) {
    message = error.message;
    code = 'FACEBOOK_API_ERROR';
  } else if (error.message.includes('Validation error')) {
    message = error.message;
    code = 'VALIDATION_ERROR';
  } else if (error.message.includes('timeout')) {
    message = 'Request timeout - try again';
    code = 'TIMEOUT_ERROR';
  } else if (error.message) {
    message = error.message;
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error (${code}): ${message}`,
      },
    ],
    isError: true,
  };
}
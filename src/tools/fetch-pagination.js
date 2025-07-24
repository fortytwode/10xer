import { FacebookAPIClient } from '../utils/facebook-api.js';
import { createErrorResponse } from '../utils/error-handler.js';
import { ValidationSchemas, validateParameters } from '../utils/validation.js';

export async function fetchPaginationUrl(args) {
  try {
    // Validate input parameters
    const validatedArgs = validateParameters(ValidationSchemas.paginationUrl, args);
    const { url } = validatedArgs;

    const client = new FacebookAPIClient();
    const data = await client.makeRequestFromFullURL(url);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    return createErrorResponse(error);
  }
}
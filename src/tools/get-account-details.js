import { FacebookAPIClient } from '../utils/facebook-api.js';
import { createErrorResponse } from '../utils/error-handler.js';
import { ValidationSchemas, validateParameters } from '../utils/validation.js';

export async function getAccountDetails(args) {
  try {
    // Validate input parameters
    const validatedArgs = validateParameters(ValidationSchemas.accountDetails, args);
    const { act_id, fields } = validatedArgs;

    const client = new FacebookAPIClient();
    
    const params = {};
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }

    const data = await client.makeRequest(`/${act_id}`, params);

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
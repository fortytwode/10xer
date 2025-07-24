import { FacebookAPIClient } from '../utils/facebook-api.js';
import { createErrorResponse } from '../utils/error-handler.js';
import { ValidationSchemas, validateParameters } from '../utils/validation.js';

export async function getAccountActivities(args) {
  try {
    // Validate input parameters
    const validatedArgs = validateParameters(ValidationSchemas.accountActivities, args);
    const { act_id, fields, ...otherParams } = validatedArgs;

    const client = new FacebookAPIClient();
    
    const params = { ...otherParams };
    
    if (fields && fields.length > 0) {
      params.fields = fields.join(',');
    }

    // Remove undefined/null values and format arrays
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === null) {
        delete params[key];
      } else if (Array.isArray(params[key])) {
        params[key] = params[key].join(',');
      }
    });

    const data = await client.makeRequest(`/${act_id}/activities`, params);

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
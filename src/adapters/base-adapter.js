/**
 * Base adapter class for different protocol implementations
 */
export class BaseAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Parse incoming request to normalized format
   * @param {Object} request - Raw request from client
   * @returns {Object} Normalized request: { toolName, args }
   */
  parseRequest(request) {
    throw new Error(`parseRequest must be implemented by ${this.name} adapter`);
  }

  /**
   * Format tool response for the specific protocol
   * @param {Object} result - Tool execution result
   * @returns {Object} Protocol-specific response
   */
  formatResponse(result) {
    throw new Error(`formatResponse must be implemented by ${this.name} adapter`);
  }

  /**
   * Get tool definitions for the protocol
   * @param {Object} toolSchemas - MCP tool schemas
   * @returns {Array} Protocol-specific tool definitions
   */
  getToolDefinitions(toolSchemas) {
    throw new Error(`getToolDefinitions must be implemented by ${this.name} adapter`);
  }

  /**
   * Handle errors in protocol-specific format
   * @param {Error} error - Error object
   * @returns {Object} Protocol-specific error response
   */
  formatError(error) {
    return {
      error: {
        message: error.message,
        type: error.constructor.name
      }
    };
  }
}
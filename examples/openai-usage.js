/**
 * Example: Using Facebook Ads tools with OpenAI Function Calling
 * 
 * This shows how to integrate the Facebook Ads server with OpenAI's function calling
 */

import OpenAI from 'openai';
import axios from 'axios';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Facebook Ads Universal Server endpoint
const FACEBOOK_ADS_API = 'http://localhost:3003';

async function getFunctionDefinitions() {
  const response = await axios.get(`${FACEBOOK_ADS_API}/openai/functions/definitions`);
  return response.data.functions;
}

async function callFacebookTool(functionCall) {
  const response = await axios.post(`${FACEBOOK_ADS_API}/openai/functions`, {
    function_call: functionCall
  });
  return response.data;
}

async function chatWithFacebookAds() {
  // Get available Facebook Ads functions
  const functions = await getFunctionDefinitions();
  
  console.log('📋 Available Facebook Ads functions:', functions.length);

  // Example conversation
  const messages = [
    {
      role: 'user',
      content: 'Show me the top performing ad thumbnails for my Akiflow account'
    }
  ];

  // Send to OpenAI with function calling enabled
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: messages,
    functions: functions,
    function_call: 'auto'
  });

  const message = completion.choices[0].message;

  // If OpenAI wants to call a function
  if (message.function_call) {
    console.log('🔧 OpenAI calling function:', message.function_call.name);
    
    // Call our Facebook Ads server
    const functionResult = await callFacebookTool(message.function_call);
    
    // Add function response to conversation
    messages.push(message);
    messages.push(functionResult);

    // Get final response from OpenAI
    const finalCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages
    });

    console.log('🤖 Final response:', finalCompletion.choices[0].message.content);
  } else {
    console.log('🤖 Direct response:', message.content);
  }
}

// Example usage
async function main() {
  try {
    await chatWithFacebookAds();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run example
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export { getFunctionDefinitions, callFacebookTool, chatWithFacebookAds };
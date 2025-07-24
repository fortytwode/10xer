/**
 * Example: Using Facebook Ads tools with Google Gemini Function Calling
 * 
 * This shows how to integrate the Facebook Ads server with Gemini's function calling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Facebook Ads Universal Server endpoint
const FACEBOOK_ADS_API = 'http://localhost:3003';

async function getFunctionDefinitions() {
  const response = await axios.get(`${FACEBOOK_ADS_API}/gemini/functions/definitions`);
  return response.data.functions;
}

async function callFacebookTool(functionCall) {
  const response = await axios.post(`${FACEBOOK_ADS_API}/gemini/functions`, {
    function_call: functionCall
  });
  return response.data;
}

async function chatWithFacebookAds() {
  // Get available Facebook Ads functions
  const functions = await getFunctionDefinitions();
  
  console.log('📋 Available Facebook Ads functions:', functions.length);

  // Initialize Gemini model with functions
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    tools: [{ functionDeclarations: functions }]
  });

  // Start chat session
  const chat = model.startChat();

  // Send user message
  const userMessage = 'Show me the top performing ad thumbnails for my Akiflow account';
  console.log('👤 User:', userMessage);

  const result = await chat.sendMessage(userMessage);
  const response = result.response;

  // Check if Gemini wants to call a function
  const functionCalls = response.functionCalls();
  
  if (functionCalls && functionCalls.length > 0) {
    console.log('🔧 Gemini calling function:', functionCalls[0].name);
    
    // Call our Facebook Ads server
    const functionResult = await callFacebookTool(functionCalls[0]);
    
    // Send function result back to Gemini
    const functionResponse = await chat.sendMessage([{
      functionResponse: {
        name: functionCalls[0].name,
        response: functionResult.function_response.response
      }
    }]);

    console.log('🤖 Final response:', functionResponse.response.text());
  } else {
    console.log('🤖 Direct response:', response.text());
  }
}

// Example of direct function calling (without chat)
async function directFunctionCall() {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Simulate a function call request
  const functionCall = {
    name: 'facebook_list_ad_accounts',
    args: {}
  };

  console.log('🔧 Direct function call:', functionCall.name);
  
  const result = await callFacebookTool(functionCall);
  console.log('📊 Function result:', JSON.stringify(result, null, 2));
}

// Example usage
async function main() {
  try {
    console.log('🚀 Testing Gemini + Facebook Ads integration\n');
    
    console.log('1. Testing chat with function calling:');
    await chatWithFacebookAds();
    
    console.log('\n2. Testing direct function call:');
    await directFunctionCall();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run example
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export { getFunctionDefinitions, callFacebookTool, chatWithFacebookAds, directFunctionCall };
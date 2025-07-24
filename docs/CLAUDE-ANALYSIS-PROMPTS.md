# Claude Analysis Prompts - Facebook Ads MCP

## 🎯 **Performance Analysis Prompt with Event Discovery**

```
I need you to analyze my Facebook Ad account performance. Follow these instructions exactly:

**STEP 1: Event Discovery First**
Before any analysis, I need to identify the correct conversion events to track.

Since you mentioned [trial/purchase/signup/etc], let me first discover your available events:

**Common patterns I'll look for:**
• **Subscription Apps**: trial_started, free_trial, subscription_created, trial_expired
• **E-commerce**: purchase, add_to_cart, initiate_checkout, payment_completed, payment_info
• **Apps & Games**: purchase, in_app_purchase, payment_info, subscription, install, level_completed
• **Lead Generation**: registration, contact_form, demo_request, lead_form

**Process:**
1. Get your account insights with action breakdowns to see all conversion events
2. List all available conversion events with their IDs
3. Present options and ask: "Which event should I analyze for this report?"
4. Wait for your confirmation before proceeding

**STEP 2: Analysis with confirmed event**
Only after you confirm the event, proceed with analysis using the exact API reference.

**CRITICAL RULES:**
- NEVER make up data - only use actual API responses
- If data is missing, state "Data not available from API"  
- Always get user confirmation on which event to analyze
- Calculate metrics only from actual numbers returned

**ANALYSIS SECTIONS:**

**1. Event Identification**
- Show the custom conversion name and ID
- Confirm this is the trial event we're analyzing

**2. Best Performing Ads (Last 7 Days)**
Split into:
- Retargeting Ads (campaigns with "Retargeting", "RT", "Remarketing" in name)
- Prospecting Ads (all others)

For each category, show top 5 ads by lowest cost per trial:
- Ad Name
- Spend (actual from API)
- Trials (using the correct conversion ID)
- Cost per Trial (calculated: spend ÷ trials)

**3. Daily Breakdown (Last 30 Days)**
- Date
- Spend (actual)
- Trials (actual using correct ID)
- Cost per Trial (calculated)
- Total row at bottom

**4. Data Availability Check**
For each requested metric, explicitly state:
- ✅ "Available from API" or ❌ "Not available from API"
- Only show sections where data is actually available

**If any section has no data, show:**
"❌ [Section Name] - Data not available from Facebook Ads API"

Remember: Use only the custom conversion ID identified in Step 1 for all trial calculations.
```

## 🔧 **Event Discovery Prompt**

```
Help me identify all conversion events in my Facebook ad account:

1. Run: facebook_get_custom_conversions for my account
2. List all custom conversions with their:
   - Human-readable name
   - API reference ID
   - Description
   - Status (active/archived)
3. Identify which ones might be related to trials, signups, or key actions
4. Suggest the correct API references to use for analysis

This will help me understand what events I can track before requesting performance analysis.
```

## 🎯 **ROAS Analysis Prompt with Event Discovery**

```
Analyze ROAS for my Facebook ad account with these strict requirements:

**STEP 1: Revenue Event Discovery**
Before calculating ROAS, I need to identify revenue-generating events:

**Revenue patterns I'll look for:**
• **Purchase Events**: purchase, buy_now, complete_purchase, payment_completed
• **Subscription Events**: subscription_created, recurring_payment, upgrade
• **App & Game Revenue**: in_app_purchase, purchase, payment_info, subscription
• **Payment Events**: payment_info, checkout_completed, transaction

**Process:**
1. Get account insights with action breakdowns and conversion values
2. Identify events that have associated revenue values
3. List all revenue events with their total values
4. Ask: "Which revenue event should I use for ROAS calculation?"

**STEP 2: ROAS calculation (only with confirmed revenue data)**
Only after you confirm the revenue event:
- Calculate ROAS = Revenue ÷ Spend using actual API values
- Show actual numbers from API responses
- Break down by campaign type (prospecting vs retargeting)

**STEP 3: Data transparency**
Clearly state what data is and isn't available:
- ✅ Available: [list actual metrics with values]
- ❌ Not available: [list missing metrics]

**CRITICAL RULES:**
- NEVER calculate ROAS without actual revenue data from the API
- Always get user confirmation on which revenue event to use
- If no purchase/revenue conversion events exist, state: "ROAS analysis not possible - no revenue conversion events found in account"
```

## 📊 **Campaign Performance Prompt (Factual Only)**

```
Create a campaign performance report using only actual Facebook Ads API data:

**REQUIREMENTS:**
1. Use actual spend, impressions, clicks, conversions from API
2. If demographic data is requested but not available, state "Demographic breakdowns not available"
3. Calculate metrics only from actual API responses
4. Show data date ranges clearly

**SECTIONS TO INCLUDE (only if data exists):**
1. Top 10 campaigns by spend (last 30 days)
2. Best performing campaigns by CPC (if click data available)
3. Conversion performance (using actual custom conversion IDs)
4. Daily trends (actual daily data, not interpolated)

**FOR MISSING DATA:**
- Demographics: "Age/gender breakdowns require additional API permissions"
- Placements: "Placement data not available in current API response"
- Attribution: "Attribution window data not included in this report"

Use facebook_get_custom_conversions first to identify available conversion events.
```

## 🔍 **Troubleshooting Prompts**

### **When Events Aren't Found:**
```
My Facebook ads aren't showing the conversion events I expect. Help me debug:

1. Run facebook_get_custom_conversions for my account
2. Check if my expected events (trial, signup, purchase) are configured
3. If events exist but show 0 conversions, explain possible causes:
   - Pixel implementation issues
   - Attribution window settings
   - Event setup problems
4. Suggest next steps for fixing conversion tracking
```

### **When Data Seems Wrong:**
```
The conversion numbers look incorrect. Help me verify:

1. Show the exact API response for my conversion data
2. Explain what each action_type means
3. Check if multiple events might be tracking the same action
4. Verify the attribution window being used
5. Compare different date ranges to spot inconsistencies

Don't adjust or "fix" the numbers - show me exactly what Facebook's API returns.
```

## 💡 **Best Practices for Claude Prompts**

### **DO:**
- ✅ Always run facebook_get_custom_conversions first
- ✅ Use exact API reference IDs for conversions
- ✅ State when data is not available
- ✅ Show actual API responses when debugging
- ✅ Calculate metrics from actual numbers only

### **DON'T:**
- ❌ Never simulate or estimate missing data
- ❌ Don't use generic event names like "trial_started"
- ❌ Don't create demographic breakdowns without API data
- ❌ Don't interpolate or smooth data trends
- ❌ Don't assume conversion values without API confirmation

## 🎯 **Quick Reference: Common Custom Conversion Patterns**

After running facebook_get_custom_conversions, look for these patterns:

**Trial Events:**
- Names containing: "trial", "free", "signup", "register"
- API format: `offsite_conversion.custom.XXXXXXXXX`

**Purchase Events:**
- Names containing: "purchase", "buy", "order", "sale"
- May have associated values for ROAS calculation

**Lead Events:**
- Names containing: "lead", "contact", "demo", "quote"
- Often used for B2B campaigns

Always use the exact API reference, never assume the event name.
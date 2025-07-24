# Quick Event Discovery Prompt

## 🚀 **Use This Prompt Right Now**

Copy and paste this into Claude Desktop to fix your trial analysis issue:

---

```
I need to analyze Facebook Ad performance, but first I need to identify the correct conversion events.

**Step 1: Event Discovery**
Please get my account insights with action breakdowns to see all available conversion events. I'm looking for events that might be related to trials, but I want to see ALL conversion events first.

**Common patterns you might find:**
• **Subscription Apps**: trial_started, free_trial, subscription_created
• **E-commerce**: purchase, payment_completed, payment_info  
• **Apps & Games**: purchase, in_app_purchase, payment_info, subscription, install
• **Lead Generation**: registration, contact_form, demo_request

**Process:**
1. Run facebook_get_adaccount_insights with action_breakdowns=['action_type'] 
2. List ALL conversion events you find (even the cryptic ones like "offsite_conversion.custom.3487707594815295")
3. For each event, show:
   - The event ID/name
   - Number of conversions 
   - What type of event it might be (trial, purchase, etc.)
4. Ask me: "Which of these events should I analyze for your report?"

**Critical Rules:**
- Show me ALL events, don't filter or assume
- Don't proceed with analysis until I confirm which event to use
- Never make up data - only use actual API responses

Please start by discovering all my conversion events.
```

---

## ✅ **What This Will Do:**

1. **Forces Claude to discover events first** before making assumptions
2. **Shows you all available conversion events** including the cryptic IDs
3. **Asks for your confirmation** before proceeding 
4. **Prevents data fabrication** by requiring API-only responses

## 📋 **Expected Response:**

Claude should respond with something like:

```
I found these conversion events in your account:

1. offsite_conversion.custom.3487707594815295 - 45 conversions
   - Likely type: Trial or signup event
   
2. offsite_conversion.fb_pixel_purchase - 12 conversions  
   - Likely type: Purchase event
   
3. link_click - 1,250 conversions
   - Likely type: Click tracking
   
Which event should I analyze for your trial performance report?
```

Then you can say: "Use event #1 for trial analysis" and Claude will use the correct ID.
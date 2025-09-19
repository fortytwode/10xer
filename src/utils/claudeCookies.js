import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// enable stealth mode
puppeteer.use(StealthPlugin());

/**
 * Extract Claude `lastActiveOrg` cookie after manual login.
 * @returns {Promise<string|null>}
 */
export async function getClaudeSessionCookie() {
  console.log("🚀 Launching browser (with stealth)...");

//   const browser = await puppeteer.launch({
//     headless: false, // must be false for manual login
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });
    const browser = await puppeteer.launch({
        headless: false,  // show the browser window
        executablePath: '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080',
        ],
    });

  try {
    const page = await browser.newPage();

    console.log("🌐 Opening Claude login page...");
    await page.goto("https://claude.ai/login", { waitUntil: "networkidle2" });

    console.log("⏳ Please log in manually and solve CAPTCHA if shown...");

    await new Promise(resolve => setTimeout(resolve, 50000));

    console.log("🔍 Fetching cookies...");
    const cookies = await page.cookies();

    const lastActiveOrgCookie = cookies.find((c) => c.name === "lastActiveOrg");

    if (!lastActiveOrgCookie) {
      throw new Error("❌ lastActiveOrg cookie not found. Did login succeed?");
    }

    console.log("✅ lastActiveOrg:", lastActiveOrgCookie.value);

    return lastActiveOrgCookie.value;
  } catch (err) {
    console.error("❌ Error in getClaudeSessionCookie:", err);
    throw err;
  } finally {
    console.log("🛑 Closing browser...");
    await browser.close();
  }
}

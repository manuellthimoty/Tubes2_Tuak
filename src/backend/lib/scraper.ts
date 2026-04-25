import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export async function scrapeHTML(url: string): Promise<string | null> {
  let finalUrl = url.trim();
  if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
    finalUrl = "https://" + finalUrl;
  }

  console.log(`[Scraper] Mengambil data dari: ${finalUrl}`);

  try {
    const response = await axios.get(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 15000,
      responseType: "text",
      maxRedirects: 10,
      httpsAgent
    });

    const html = typeof response.data === "string" ? response.data : String(response.data);
    return html;
  } catch (error: any) {
    const msg = error.response
      ? `HTTP ${error.response.status}: ${error.response.statusText}`
      : error.message || "Gagal fetch";
    console.error("[Scraper] Gagal mendapatkan HTML:", msg);
    return null;
  }
}

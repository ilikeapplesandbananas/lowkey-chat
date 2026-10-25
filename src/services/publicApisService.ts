// Specialized Integration for Curated Public APIs (from ilikeapplesandbananas/public-apis)
// Includes Zenserp (Fast, Accurate Google Search Data), Newton Math, Free Dictionary, Wikipedia, and Open-Meteo

export interface ToolResult {
  toolName: string;
  success: boolean;
  data?: any;
  summary?: string;
}

const DEFAULT_ZENSERP_KEY = "8df5a790-cfd9-11f1-9339-bfb53d6af7fd";

export const getZenserpKey = (): string => {
  const localKey = localStorage.getItem("lowkey_zenserp_key");
  if (localKey && localKey.trim()) return localKey.trim();
  return import.meta.env.VITE_ZENSERP_API_KEY || DEFAULT_ZENSERP_KEY;
};

export const setZenserpKey = (key: string) => {
  localStorage.setItem("lowkey_zenserp_key", key);
};

// Safe fetch with fast timeout to prevent UI freezes
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs: number = 1500): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const publicApisService = {
  // 1. Zenserp Google Search API (Fast, Accurate Google Search Data from public-apis)
  async queryZenserp(searchQuery: string, num: number = 4): Promise<ToolResult> {
    const apiKey = getZenserpKey();
    if (!apiKey) return { toolName: "Zenserp Google Search", success: false, summary: "No API key configured" };

    const encodedQuery = encodeURIComponent(searchQuery);
    const endpoints = [
      `https://app.zenserp.com/api/v2/search?apikey=${apiKey}&q=${encodedQuery}&num=${num}&hl=en&gl=us`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://app.zenserp.com/api/v2/search?apikey=${apiKey}&q=${encodedQuery}&num=${num}&hl=en&gl=us`)}`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetchWithTimeout(url, {
          headers: {
            apikey: apiKey,
            Accept: "application/json",
          },
        }, 1500);

        if (!res.ok) continue;
        const data = await res.json();
        const summaryParts: string[] = [];

        // Direct answer box
        if (data.answer_box?.answer) {
          summaryParts.push(`Direct Answer: ${data.answer_box.answer}`);
        } else if (data.answer_box?.snippet) {
          summaryParts.push(`Direct Snippet: ${data.answer_box.snippet}`);
        }

        // Knowledge graph
        if (data.knowledge_graph?.title && data.knowledge_graph?.description) {
          summaryParts.push(`Knowledge Graph: ${data.knowledge_graph.title} - ${data.knowledge_graph.description}`);
        }

        // Organic web results
        if (data.organic && Array.isArray(data.organic)) {
          data.organic.slice(0, num).forEach((item: any, idx: number) => {
            if (item.title && item.description) {
              summaryParts.push(`[Source ${idx + 1}: ${item.title}] ${item.description} (URL: ${item.url})`);
            }
          });
        }

        if (summaryParts.length > 0) {
          return {
            toolName: "Zenserp Google Search",
            success: true,
            data,
            summary: summaryParts.join("\n\n"),
          };
        }
      } catch (err) {
        // Continue to fallback endpoint or fail gracefully without delay
      }
    }

    return { toolName: "Zenserp Google Search", success: false, summary: "Could not retrieve live search data" };
  },

  // 2. Newton Math API (Science & Math from public-apis)
  async queryNewtonMath(operation: "zeroes" | "derive" | "factor" | "integrate" | "simplify", expression: string): Promise<ToolResult> {
    try {
      const sanitizedExpr = encodeURIComponent(expression.replace(/\s+/g, ""));
      const res = await fetchWithTimeout(`https://newton.vercel.app/api/v2/${operation}/${sanitizedExpr}`, {}, 1200);
      if (!res.ok) throw new Error(`Newton API status ${res.status}`);
      const data = await res.json();
      return {
        toolName: "Newton Math API",
        success: true,
        data,
        summary: `Computed ${operation} of ${expression}: ${JSON.stringify(data.result)}`,
      };
    } catch (e: any) {
      return { toolName: "Newton Math API", success: false, summary: e.message };
    }
  },

  // 3. Free Dictionary API (Dictionaries from public-apis)
  async queryDictionary(word: string): Promise<ToolResult> {
    try {
      const cleanWord = encodeURIComponent(word.trim().toLowerCase());
      const res = await fetchWithTimeout(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`, {}, 1200);
      if (!res.ok) throw new Error(`Dictionary API status ${res.status}`);
      const data = await res.json();
      const firstEntry = Array.isArray(data) ? data[0] : data;

      return {
        toolName: "Free Dictionary API",
        success: true,
        data: {
          word: firstEntry.word,
          phonetic: firstEntry.phonetic,
          meanings: firstEntry.meanings?.map((m: any) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: m.definitions?.slice(0, 2).map((d: any) => d.definition),
          })),
        },
      };
    } catch (e: any) {
      return { toolName: "Free Dictionary API", success: false, summary: e.message };
    }
  },

  // 4. Wikipedia Knowledge API (Open Data from public-apis)
  async queryWikipedia(query: string): Promise<ToolResult> {
    try {
      const cleanTitle = encodeURIComponent(query.trim().replace(/\s+/g, "_"));
      const res = await fetchWithTimeout(`https://en.wikipedia.org/api/rest_v1/page/summary/${cleanTitle}`, {}, 1200);
      if (!res.ok) throw new Error(`Wikipedia API status ${res.status}`);
      const data = await res.json();

      return {
        toolName: "Wikipedia Knowledge API",
        success: true,
        data: {
          title: data.title,
          description: data.description,
          extract: data.extract,
          url: data.content_urls?.desktop?.page,
        },
      };
    } catch (e: any) {
      return { toolName: "Wikipedia Knowledge API", success: false, summary: e.message };
    }
  },

  // 5. Open-Meteo Weather API (Weather from public-apis)
  async queryWeather(city: string): Promise<ToolResult> {
    try {
      const geoRes = await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, {}, 1200);
      if (!geoRes.ok) throw new Error("City lookup failed");
      const geoData = await geoRes.json();
      const location = geoData.results?.[0];
      if (!location) throw new Error(`Could not find coordinates for ${city}`);

      const weatherRes = await fetchWithTimeout(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true`,
        {},
        1200
      );
      if (!weatherRes.ok) throw new Error("Forecast lookup failed");
      const weatherData = await weatherRes.json();

      return {
        toolName: "Open-Meteo Weather API",
        success: true,
        data: weatherData,
        summary: `Current weather in ${location.name}, ${location.country}: ${weatherData.current_weather?.temperature}°C, wind speed ${weatherData.current_weather?.windspeed} km/h`,
      };
    } catch (e: any) {
      return { toolName: "Open-Meteo Weather API", success: false, summary: e.message };
    }
  },

  // 6. Non-blocking Context & Search Dispatcher (Max 1500ms total guarantee)
  async fetchContextualData(query: string): Promise<string> {
    return Promise.race([
      this._internalFetchContext(query),
      new Promise<string>((resolve) => setTimeout(() => resolve(""), 1500)),
    ]);
  },

  async _internalFetchContext(query: string): Promise<string> {
    const q = query.trim().toLowerCase();
    const results: string[] = [];

    // Real-Time Temporal Grounding Anchor (Current Year & Date)
    if (/(what year|which year|current year|what is the year|today's date|what date is it|what day is it|current date|what is today)/i.test(q)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const currentYear = now.getFullYear();
      results.push(`[Verified Real-World Temporal Anchor] Today's exact date is ${dateStr}. The current year is strictly ${currentYear}. You are living in the present year ${currentYear}.`);
    }

    // Math query: zeroes / derivative / factoring via Newton Math API
    if (/(\d+x\^?2|quadratic|roots of)/i.test(q)) {
      const exprMatch = query.match(/([+-]?\s*\d*x\^?2\s*[+-]\s*\d*x\s*[+-]\s*\d+)/i);
      if (exprMatch) {
        const cleanExpr = exprMatch[1].replace(/\s+/g, "");
        const zeroesRes = await this.queryNewtonMath("zeroes", cleanExpr);
        const factorRes = await this.queryNewtonMath("factor", cleanExpr);
        if (zeroesRes.success) {
          results.push(`[Newton Math Ground Truth] Exact roots: ${JSON.stringify(zeroesRes.data.result)}. Factors: ${JSON.stringify(factorRes.data?.result)}.`);
        }
      }
    } else if (/(derivative of|derive |d\/dx)/i.test(q)) {
      const exprMatch = query.match(/(?:derivative of|derive|d\/dx)\s*([a-zA-Z0-9\^\+\-\*/\s\(\)]+)/i);
      if (exprMatch) {
        const deriveRes = await this.queryNewtonMath("derive", exprMatch[1].trim());
        if (deriveRes.success) {
          results.push(`[Newton Math Ground Truth] Derivative: ${deriveRes.data.result}.`);
        }
      }
    }

    // Dictionary query
    if (/(?:definition of|define|meaning of)\s+([a-zA-Z\-]+)/i.test(q)) {
      const wordMatch = q.match(/(?:definition of|define|meaning of)\s+([a-zA-Z\-]+)/i);
      if (wordMatch) {
        const dictRes = await this.queryDictionary(wordMatch[1]);
        if (dictRes.success && dictRes.data) {
          const defs = dictRes.data.meanings?.map((m: any) => `${m.partOfSpeech}: ${m.definitions?.join("; ")}`).join(" | ");
          results.push(`[Free Dictionary Ground Truth] Word: ${dictRes.data.word}. Definitions: ${defs}.`);
        }
      }
    }

    // Weather query
    if (/(?:weather in|temperature in|forecast for)\s+([a-zA-Z\s]+)/i.test(q)) {
      const cityMatch = q.match(/(?:weather in|temperature in|forecast for)\s+([a-zA-Z\s]+)/i);
      if (cityMatch) {
        const weatherRes = await this.queryWeather(cityMatch[1].trim());
        if (weatherRes.success) {
          results.push(`[Open-Meteo Weather Ground Truth] ${weatherRes.summary}`);
        }
      }
    }

    // Live Web Search via Zenserp (Fast, accurate Google search data)
    // Only trigger on explicit real-time search or news queries
    const needsWebSearch =
      /(latest news|breaking news|current events|recent news|who won the|release date of|live score|stock price of)/i.test(q);

    if (needsWebSearch) {
      try {
        const zenserpRes = await this.queryZenserp(query, 3);
        if (zenserpRes.success && zenserpRes.summary) {
          results.push(`[Live Google Search Data via Zenserp]\n${zenserpRes.summary}`);
        }
      } catch (e) {
        console.warn("Zenserp search dispatch notice:", e);
      }
    }

    return results.join("\n\n");
  },
};

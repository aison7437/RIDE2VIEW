/**
 * RIDE2VIEW AI OS
 * Google Trends Provider
 *
 * Purpose:
 *   Provides a clean abstraction around the Google Trends API.
 *
 * Architecture:
 *
 *   Google Trends API
 *          ↓
 *   GoogleTrendsProvider
 *          ↓
 *   Trend Intelligence
 *          ↓
 *   Opportunity Discovery
 *          ↓
 *   Reasoning
 *          ↓
 *   Opportunity Scoring
 *
 * IMPORTANT:
 *   This provider intentionally does not contain RIDE2VIEW
 *   recommendation or scoring logic.
 *
 * Environment variables:
 *
 *   GOOGLE_TRENDS_API_URL
 *   GOOGLE_TRENDS_API_KEY
 *
 * The exact endpoint/authentication parameters should be configured
 * according to the Google Trends API access provided to your project.
 */

class GoogleTrendsProvider {
  constructor(options = {}) {
    this.baseUrl =
      options.baseUrl ||
      process.env.GOOGLE_TRENDS_API_URL;

    this.apiKey =
      options.apiKey ||
      process.env.GOOGLE_TRENDS_API_KEY;

    this.timeout =
      options.timeout ||
      10000;

    if (!this.baseUrl) {
      throw new Error(
        "GOOGLE_TRENDS_API_URL is not configured"
      );
    }

    if (!this.apiKey) {
      throw new Error(
        "GOOGLE_TRENDS_API_KEY is not configured"
      );
    }
  }

  /**
   * Execute an HTTP request with timeout protection.
   */
  async request(path, params = {}) {
    const url = new URL(path, this.baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });

    url.searchParams.set("key", this.apiKey);

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await response.text();

        throw new Error(
          `Google Trends API request failed: ${response.status} ${response.statusText} ${body}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Google Trends API request timed out"
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Retrieve trend data for a search term.
   *
   * @param {Object} options
   * @param {string} options.keyword
   * @param {string} [options.geo]
   * @param {string} [options.timeRange]
   * @param {string} [options.category]
   */
  async getTrend(options = {}) {
    const {
      keyword,
      geo = "KE",
      timeRange = "today 12-m",
      category = "0"
    } = options;

    if (!keyword || typeof keyword !== "string") {
      throw new Error(
        "A valid keyword is required"
      );
    }

    const data = await this.request(
      "/trends",
      {
        keyword,
        geo,
        timeRange,
        category
      }
    );

    return this.normalizeTrendResponse({
      keyword,
      geo,
      timeRange,
      category,
      data
    });
  }

  /**
   * Retrieve trends for multiple keywords.
   *
   * Useful for RIDE2VIEW property, mobility and food
   * demand intelligence.
   */
  async getTrends(keywords = [], options = {}) {
    if (!Array.isArray(keywords)) {
      throw new Error(
        "keywords must be an array"
      );
    }

    const results = [];

    for (const keyword of keywords) {
      try {
        const trend = await this.getTrend({
          keyword,
          ...options
        });

        results.push({
          success: true,
          ...trend
        });
      } catch (error) {
        results.push({
          success: false,
          keyword,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Retrieve geographic trend information.
   *
   * Example:
   *
   * Nairobi
   * Westlands
   * Kilimani
   * Karen
   * Mombasa
   */
  async getGeographicTrend(options = {}) {
    const {
      keyword,
      geo = "KE",
      timeRange = "today 12-m"
    } = options;

    if (!keyword) {
      throw new Error(
        "keyword is required for geographic trend analysis"
      );
    }

    const data = await this.request(
      "/trends/geo",
      {
        keyword,
        geo,
        timeRange
      }
    );

    return {
      keyword,
      geo,
      timeRange,
      data,
      retrievedAt: new Date().toISOString()
    };
  }

  /**
   * Normalize Google data into a RIDE2VIEW-friendly
   * intelligence structure.
   *
   * IMPORTANT:
   *
   * This method intentionally avoids assuming Google's
   * exact response schema. The mapping should be finalized
   * against the actual API response available to your
   * project.
   */
  normalizeTrendResponse({
    keyword,
    geo,
    timeRange,
    category,
    data
  }) {
    return {
      source: "google_trends",

      keyword,

      geography: geo,

      category,

      timeRange,

      retrievedAt: new Date().toISOString(),

      raw: data,

      signal: {
        interest: this.extractInterest(data),

        momentum: null,

        direction: null,

        confidence: null
      }
    };
  }

  /**
   * Extract the latest interest value.
   *
   * The exact extraction path must be mapped to the
   * response schema returned by your Google Trends API
   * access.
   */
  extractInterest(data) {
    if (!data) {
      return null;
    }

    if (
      typeof data.interest === "number"
    ) {
      return data.interest;
    }

    if (
      data.signal &&
      typeof data.signal.interest === "number"
    ) {
      return data.signal.interest;
    }

    return null;
  }

  /**
   * Calculate basic momentum from historical values.
   *
   * Example:
   *
   * previous = 50
   * current  = 75
   *
   * momentum = +50%
   */
  calculateMomentum(previous, current) {
    if (
      typeof previous !== "number" ||
      typeof current !== "number"
    ) {
      return null;
    }

    if (previous === 0) {
      return current > 0 ? 1 : 0;
    }

    return (current - previous) / previous;
  }

  /**
   * Convert momentum into a simple direction.
   */
  getDirection(momentum) {
    if (momentum === null) {
      return "unknown";
    }

    if (momentum > 0.05) {
      return "rising";
    }

    if (momentum < -0.05) {
      return "falling";
    }

    return "stable";
  }

  /**
   * Health check.
   *
   * Useful for monitoring and GitHub Actions.
   */
  async healthCheck() {
    try {
      await this.request(
        "/health"
      );

      return {
        healthy: true,
        provider: "google_trends",
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        provider: "google_trends",
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    }
  }
}

module.exports = GoogleTrendsProvider;

/**
 * Shared error type for browser adapters (playwright, browserless).
 * Allows starwinelist-scraper to check for 429 etc. without depending on a specific adapter.
 */
export class BrowserAdapterError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string
  ) {
    super(message);
    this.name = "BrowserAdapterError";
  }
}

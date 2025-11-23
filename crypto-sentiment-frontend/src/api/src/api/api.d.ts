export function getTwitter(limit?: number): Promise<any[]>;
export function getReddit(
  limit?: number,
  coin?: string | null,
  signal?: AbortSignal
): Promise<any[]>;
export function getNews(limit?: number): Promise<any[]>;

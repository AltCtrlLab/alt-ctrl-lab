/**
 * RSS News Fetcher
 * Fetches top news from public RSS feeds — no API key required.
 * Sources: Le Monde, BFM TV, BBC News, The Guardian
 */

import { getDb } from '@/lib/db';
import { newsItems } from '@/lib/db/schema_news';
import { desc, gte } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const RSS_SOURCES = [
  {
    url: 'https://www.lemonde.fr/rss/une.xml',
    label: 'Le Monde',
    category: 'general',
  },
  {
    url: 'https://www.bfmtv.com/rss/news-24-7/',
    label: 'BFM TV',
    category: 'general',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    label: 'BBC News',
    category: 'international',
  },
  {
    url: 'https://www.theguardian.com/world/rss',
    label: 'The Guardian',
    category: 'international',
  },
];

interface ParsedItem {
  title: string;
  url: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  source: string;
  sourceLabel: string;
  category: string;
}

function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdataMatch) return cdataMatch[1].trim();

  // Try regular tag
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (match) {
    return match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
  return '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}

function extractImageFromItem(itemXml: string): string | null {
  // media:content
  let img = extractAttr(itemXml, 'media:content', 'url');
  if (img) return img;

  // media:thumbnail
  img = extractAttr(itemXml, 'media:thumbnail', 'url');
  if (img) return img;

  // enclosure
  img = extractAttr(itemXml, 'enclosure', 'url');
  if (img && (img.includes('.jpg') || img.includes('.png') || img.includes('.webp'))) return img;

  // og:image in description
  const descMatch = itemXml.match(/src="(https?:\/\/[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
  if (descMatch) return descMatch[1];

  return null;
}

function parseRSS(xml: string, sourceLabel: string, category: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  // Extract all <item> blocks
  const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches.slice(0, 4)) {
    const title = extractTag(itemXml, 'title');
    if (!title) continue;

    // Link — try <link> and <guid>
    let url = extractTag(itemXml, 'link');
    if (!url) {
      // Some feeds put link as self-closing or after CDATA
      const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/i) ||
                        itemXml.match(/<link\s+href="([^"]+)"/i);
      url = linkMatch ? linkMatch[1] : '';
    }
    if (!url) url = extractTag(itemXml, 'guid');

    const description = extractTag(itemXml, 'description');
    const pubDateStr = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date');
    const publishedAt = pubDateStr ? new Date(pubDateStr) : null;
    const imageUrl = extractImageFromItem(itemXml);

    // Clean summary (strip HTML, limit length)
    const summary = description.replace(/<[^>]+>/g, '').slice(0, 280).trim();

    items.push({
      title,
      url,
      summary,
      imageUrl,
      publishedAt,
      source: sourceLabel.toLowerCase().replace(/\s+/g, '_'),
      sourceLabel,
      category,
    });
  }

  return items;
}

async function fetchRSSSource(source: typeof RSS_SOURCES[0]): Promise<ParsedItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AltCtrlLab/1.0; RSS Reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRSS(xml, source.label, source.category);
  } catch {
    return [];
  }
}

export async function fetchAndStoreNews(): Promise<{ stored: number; sources: string[] }> {
  const db = getDb();

  // Delete all existing news before refresh
  await db.delete(newsItems);

  const allItems: ParsedItem[] = [];
  const successSources: string[] = [];

  for (const source of RSS_SOURCES) {
    const items = await fetchRSSSource(source);
    if (items.length > 0) {
      allItems.push(...items);
      successSources.push(source.label);
    }
  }

  if (allItems.length === 0) {
    return { stored: 0, sources: [] };
  }

  // Sort by publishedAt desc, take top 8
  const sorted = allItems
    .filter(i => i.title && i.url)
    .sort((a, b) => {
      const ta = a.publishedAt?.getTime() || 0;
      const tb = b.publishedAt?.getTime() || 0;
      return tb - ta;
    })
    .slice(0, 8);

  const now = new Date();

  for (const item of sorted) {
    await db.insert(newsItems).values({
      id: randomUUID(),
      title: item.title,
      summary: item.summary || null,
      url: item.url,
      imageUrl: item.imageUrl || null,
      source: item.source,
      sourceLabel: item.sourceLabel,
      publishedAt: item.publishedAt || null,
      fetchedAt: now,
      category: item.category,
      importance: 5,
    });
  }

  return { stored: sorted.length, sources: successSources };
}

export async function getLatestNews(limit = 8) {
  const db = getDb();
  return await db
    .select()
    .from(newsItems)
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);
}

export async function shouldRefreshNews(): Promise<boolean> {
  const db = getDb();
  const latest = await db
    .select()
    .from(newsItems)
    .orderBy(desc(newsItems.fetchedAt))
    .limit(1);

  if (latest.length === 0) return true;

  const lastFetch = latest[0].fetchedAt;
  const now = new Date();

  // Refresh if more than 6 hours old
  return now.getTime() - lastFetch.getTime() > 6 * 60 * 60 * 1000;
}

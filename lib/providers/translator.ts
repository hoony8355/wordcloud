import { fetchJson } from './http';

export interface TranslatorProvider {
  name: string;
  translate(text: string, source: string, target: string): Promise<string>;
}

class LibreTranslateProvider implements TranslatorProvider {
  name = 'libretranslate';

  async translate(text: string, source: string, target: string): Promise<string> {
    const baseUrl = process.env.LIBRETRANSLATE_URL ?? 'https://libretranslate.de/translate';
    const apiKey = process.env.LIBRETRANSLATE_API_KEY;

    const payload = {
      q: text,
      source,
      target,
      format: 'text',
      api_key: apiKey
    };

    const response = await fetchJson<{ translatedText?: string }>(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => ({ translatedText: text }));

    return (response.translatedText ?? text).trim();
  }
}

const defaultProvider: TranslatorProvider = new LibreTranslateProvider();

export async function translateKeyword(
  text: string,
  source = 'ko',
  target = 'en',
  provider: TranslatorProvider = defaultProvider
): Promise<{ translated: string; provider: string }> {
  const translated = await provider.translate(text, source, target);
  return { translated, provider: provider.name };
}

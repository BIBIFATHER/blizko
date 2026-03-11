import { useEffect } from 'react';

interface SeoHeadProps {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    schema?: Record<string, unknown>;
}

/**
 * Lightweight <head> manager for SEO pages.
 * Sets document.title, meta description, canonical, OG/Twitter tags, and JSON-LD schema.
 * Cleans up on unmount to restore defaults.
 */
export const SeoHead: React.FC<SeoHeadProps> = ({
    title,
    description,
    canonical,
    ogImage = '/og-image.png',
    schema,
}) => {
    useEffect(() => {
        const prevTitle = document.title;

        // Title
        document.title = title;

        // Helper: create or update a <meta> tag
        const setMeta = (attr: string, key: string, content: string) => {
            let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
            if (!el) {
                el = document.createElement('meta');
                el.setAttribute(attr, key);
                document.head.appendChild(el);
            }
            el.setAttribute('content', content);
        };

        // Meta description
        setMeta('name', 'description', description);

        // Canonical
        let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (!canonicalEl) {
            canonicalEl = document.createElement('link');
            canonicalEl.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalEl);
        }
        canonicalEl.setAttribute('href', canonical);

        // Open Graph
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', description);
        setMeta('property', 'og:url', canonical);
        setMeta('property', 'og:image', ogImage);

        // Twitter Card
        setMeta('name', 'twitter:title', title);
        setMeta('name', 'twitter:description', description);
        setMeta('name', 'twitter:image', ogImage);

        // JSON-LD Schema
        let schemaScript: HTMLScriptElement | null = null;
        if (schema) {
            schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.setAttribute('data-seo-page', 'true');
            schemaScript.textContent = JSON.stringify(schema);
            document.head.appendChild(schemaScript);
        }

        // Cleanup on unmount
        return () => {
            document.title = prevTitle;
            if (schemaScript) {
                schemaScript.remove();
            }
            canonicalEl?.remove();
        };
    }, [title, description, canonical, ogImage, schema]);

    return null;
};

export default SeoHead;

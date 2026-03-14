import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    schema?: Record<string, unknown>;
}

/**
 * Lightweight <head> manager for SEO pages using react-helmet-async.
 * Sets document.title, meta description, canonical, OG/Twitter tags, and JSON-LD schema.
 */
export const SeoHead: React.FC<SeoHeadProps> = ({
    title,
    description,
    canonical,
    ogImage = '/og-image.png',
    schema,
}) => {
    return (
        <Helmet>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonical} />

            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonical} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:type" content="website" />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
};

export default SeoHead;

/**
 * Structured data (schema.org JSON-LD).
 *
 * This is the half of SEO that search engines and AI answer engines read
 * instead of guessing: it tells them Cairn is a free software product, what it
 * does, and what questions it answers. The FAQ graph is what earns the
 * expandable Q&A block in results pages.
 */

import {
  FAQ_ITEMS,
  GITHUB_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
} from "@/lib/site";

/** Renders one JSON-LD block. Server-rendered, so crawlers see it in the HTML. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is inserted verbatim; `<` is escaped so a value
      // containing "</script>" cannot break out of the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const organization = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: absoluteUrl("/logo.svg") },
  sameAs: [GITHUB_URL],
};

const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en",
};

/**
 * The product itself. `offers` at price 0 is what makes Google surface the
 * "Free" label — worth having, since free is the main differentiator against
 * paid course platforms.
 */
const softwareApplication = {
  "@type": "SoftwareApplication",
  "@id": `${SITE_URL}/#software`,
  name: SITE_NAME,
  applicationCategory: "EducationalApplication",
  applicationSubCategory: "Learning path generator",
  operatingSystem: "Web browser",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  slogan: SITE_TAGLINE,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Personalized 12-week learning path generated from a free-form goal",
    "Curated free tutorials and resources per milestone",
    "AI code review of submitted GitHub repositories",
    "Multimodal review of project screenshots",
    "Cryptographically signed skill credentials",
    "Public recruiter-ready portfolio page",
    "Adaptive quizzes and mock interviews",
  ],
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const faqPage = {
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

/**
 * One @graph for the whole site rather than several sibling blocks — the
 * @id cross-references let crawlers resolve the entities into a single model.
 */
export function SiteJsonLd() {
  return <JsonLd data={{ "@context": "https://schema.org", "@graph": [organization, website, softwareApplication] }} />;
}

/**
 * FAQ rich result. Landing page only — the site graph already ships from the
 * root layout, so this block deliberately carries nothing but the FAQ.
 */
export function FaqJsonLd() {
  return <JsonLd data={{ "@context": "https://schema.org", ...faqPage }} />;
}

/** Breadcrumb trail for a sub-page. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}

/** A learner's public portfolio, described as a Person with credentials. */
export function PortfolioJsonLd({
  name,
  handle,
  targetRole,
  avatarUrl,
  githubUsername,
  credentials,
}: {
  name: string;
  handle: string;
  targetRole?: string;
  avatarUrl?: string;
  githubUsername?: string;
  credentials: { name: string; issuedAt?: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: absoluteUrl(`/u/${handle}`),
        mainEntity: {
          "@type": "Person",
          name,
          alternateName: handle,
          ...(targetRole ? { jobTitle: targetRole } : {}),
          ...(avatarUrl ? { image: avatarUrl } : {}),
          ...(githubUsername ? { sameAs: [`https://github.com/${githubUsername}`] } : {}),
          hasCredential: credentials.map((c) => ({
            "@type": "EducationalOccupationalCredential",
            name: c.name,
            credentialCategory: "badge",
            recognizedBy: { "@id": `${SITE_URL}/#organization` },
            ...(c.issuedAt ? { dateCreated: c.issuedAt } : {}),
          })),
        },
      }}
    />
  );
}

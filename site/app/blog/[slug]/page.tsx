import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { posts, siteConfig } from '@/lib/site';

export function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = posts.find(x => x.slug === slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: 'article',
      title: p.title,
      description: p.description,
      publishedTime: p.publishedAt,
      modifiedTime: p.updatedAt,
      url: `/blog/${p.slug}`
    }
  };
}

function VPCDiagram() {
  return (
    <div style={{
      margin: '40px 0',
      padding: '28px',
      background: 'white',
      border: '1px solid var(--line)',
      borderRadius: '16px',
      boxShadow: '0 12px 36px rgba(16,42,42,0.06)',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '28px',
        fontWeight: 750,
        fontSize: '13px',
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
      }}>
        VaaniEval Security Boundary & Deployment Topology
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* External services box */}
        <div style={{
          padding: '20px',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          background: 'var(--cream)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '16px',
            background: 'var(--muted)',
            color: 'white',
            fontSize: '9px',
            fontWeight: 800,
            padding: '1px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            External APIs (Third-Party SaaS)
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
            marginTop: '4px'
          }}>
            <div style={{
              padding: '10px 18px',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 650,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              🎙️ Voice Providers (Vapi / ElevenLabs)
            </div>
            <div style={{
              padding: '10px 18px',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 650,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              🤖 Approved LLMs (Azure OpenAI / Anthropic)
            </div>
          </div>
        </div>

        {/* Flow arrows */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--teal)',
          fontSize: '16px',
          margin: '2px 0'
        }}>
          <span>⇅</span>
          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>HTTPS over TLS (Direct Connections)</span>
        </div>

        {/* Private VPC Boundary */}
        <div style={{
          padding: '28px 24px 24px',
          border: '2px dashed var(--teal)',
          borderRadius: '14px',
          background: 'var(--mint)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-12px',
            left: '20px',
            background: 'var(--teal)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 850,
            padding: '2px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            🛡️ Secure Enterprise VPC Perimeter
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              padding: '16px',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(12,112,107,0.04)'
            }}>
              <strong style={{ display: 'block', fontSize: '14px', color: 'var(--teal)' }}>React Workspace UI</strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>Authenticated dashboard and review tool</span>
            </div>

            <div style={{
              padding: '16px',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(12,112,107,0.04)'
            }}>
              <strong style={{ display: 'block', fontSize: '14px', color: 'var(--teal)' }}>FastAPI Service</strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>Data ingestion, webhook handling, and API routing</span>
            </div>

            <div style={{
              padding: '16px',
              background: 'white',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(12,112,107,0.04)'
            }}>
              <strong style={{ display: 'block', fontSize: '14px', color: 'var(--teal)' }}>Async DB Worker</strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>Queue execution and evaluator orchestration</span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginTop: '16px'
          }}>
            <div style={{
              padding: '14px',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>🗄️</span>
              <div>
                <strong style={{ display: 'block', fontSize: '13px' }}>Encrypted PostgreSQL / SQLite</strong>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Credential encryption at rest</span>
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>📦</span>
              <div>
                <strong style={{ display: 'block', fontSize: '13px' }}>Private S3 / Local Media</strong>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Temporary audio file caching</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function Page({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = posts.find(x => x.slug === slug);
  if (!p) notFound();

  // Simple custom markdown-like renderer
  const parsedBlocks: any[] = [];
  let currentList: string[] = [];

  for (const line of p.content) {
    if (line.startsWith('- ')) {
      currentList.push(line.slice(2));
    } else {
      if (currentList.length > 0) {
        parsedBlocks.push({ type: 'ul', items: currentList });
        currentList = [];
      }

      if (line.startsWith('## ')) {
        parsedBlocks.push({ type: 'h2', text: line.slice(3) });
      } else if (line.startsWith('### ')) {
        parsedBlocks.push({ type: 'h3', text: line.slice(4) });
      } else if (/^\[[^\]]+\]\((?:\/|https:\/\/)[^)]+\)$/.test(line)) {
        const match = line.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) parsedBlocks.push({ type: 'link', label: match[1], href: match[2], external: match[2].startsWith('http') });
      } else if (line.startsWith('![') && line.includes('](') && line.endsWith(')')) {
        const altStart = 2;
        const altEnd = line.indexOf('](');
        const srcStart = altEnd + 2;
        const srcEnd = line.length - 1;
        const alt = line.slice(altStart, altEnd);
        const src = line.slice(srcStart, srcEnd);
        parsedBlocks.push({ type: 'image', alt, src });
      } else if (line === '[VPC_DIAGRAM]') {
        parsedBlocks.push({ type: 'diagram', name: 'vpc' });
      } else {
        parsedBlocks.push({ type: 'p', text: line });
      }
    }
  }

  if (currentList.length > 0) {
    parsedBlocks.push({ type: 'ul', items: currentList });
  }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    description: p.description,
    datePublished: p.publishedAt,
    dateModified: p.updatedAt || p.publishedAt,
    author: { '@type': 'Organization', name: 'VaaniEval' },
    publisher: { '@type': 'Organization', name: 'VaaniEval' },
    mainEntityOfPage: `${siteConfig.url}/blog/${p.slug}`
  };

  return (
    <article>
      <header className="page-hero shell">
        <p className="eyebrow">{p.category}</p>
        <h1>{p.title}</h1>
        <p className="lede">{p.description}</p>
        <div className="article-meta">
          <time dateTime={p.publishedAt}>{p.publishedAt}</time>
          {p.updatedAt && <><span>·</span><span>Updated <time dateTime={p.updatedAt}>{p.updatedAt}</time></span></>}
          <span>·</span>
          <span>{p.readingTime}</span>
        </div>
      </header>
      <div className="content-shell article-body">
        {parsedBlocks.map((block, idx) => {
          if (block.type === 'h2') {
            return <h2 key={idx}>{block.text}</h2>;
          }
          if (block.type === 'h3') {
            return <h3 key={idx}>{block.text}</h3>;
          }
          if (block.type === 'ul') {
            return (
              <ul key={idx}>
                {block.items.map((item: string, i: number) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
              </ul>
            );
          }
          if (block.type === 'image') {
            return (
              <figure key={idx} style={{ margin: '36px 0', textAlign: 'center' }}>
                <img
                  src={block.src}
                  alt={block.alt}
                  style={{
                    maxWidth: '100%',
                    borderRadius: '12px',
                    border: '1px solid var(--line)',
                    boxShadow: '0 8px 30px rgba(16,42,42,0.06)'
                  }}
                />
                <figcaption style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                  {block.alt}
                </figcaption>
              </figure>
            );
          }
          if (block.type === 'diagram') {
            return <VPCDiagram key={idx} />;
          }
          if (block.type === 'link') {
            if (block.external) {
              return <p key={idx}><a className="text-link" href={block.href} target="_blank" rel="noreferrer">{block.label} <span aria-hidden="true">→</span></a></p>;
            }
            return <p key={idx}><Link className="text-link" href={block.href}>{block.label} <span aria-hidden="true">→</span></Link></p>;
          }

          return (
            <p
              key={idx}
              style={idx === 0 ? { fontSize: '20px', color: 'var(--ink)', lineHeight: '1.6' } : undefined}
              dangerouslySetInnerHTML={{ __html: block.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          );
        })}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
    </article>
  );
}

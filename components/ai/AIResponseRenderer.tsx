'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, TrendingUp, ExternalLink } from 'lucide-react';

interface AIResponseRendererProps {
  content: string;
}

/** Detect emoji at start of a heading for auto-icon. */
function extractLeadingEmoji(text: string): { emoji: string | null; rest: string } {
  const emojiMatch = text.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u);
  if (emojiMatch) {
    return { emoji: emojiMatch[1], rest: text.slice(emojiMatch[0].length) };
  }
  return { emoji: null, rest: text };
}

/** Render inline markdown (bold, italic, code, links). */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold**, *italic*, `code`, [text](url)
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={match.index} className="font-semibold text-zinc-100">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={match.index} className="italic text-zinc-300">{match[2]}</em>);
    } else if (match[3]) {
      parts.push(<code key={match.index} className="px-1.5 py-0.5 text-[11px] bg-white/[0.06] border border-white/[0.08] rounded text-fuchsia-300 font-mono">{match[3]}</code>);
    } else if (match[4] && match[5]) {
      parts.push(
        <a key={match.index} href={match[5]} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 inline-flex items-center gap-0.5">
          {match[4]}<ExternalLink className="w-2.5 h-2.5" />
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

interface ParsedBlock {
  type: 'heading' | 'list-item' | 'quote' | 'code-block' | 'paragraph' | 'separator';
  content: string;
  level?: number;
  emoji?: string | null;
  language?: string;
}

function parseMarkdown(content: string): ParsedBlock[] {
  const lines = content.split('\n');
  const blocks: ParsedBlock[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';

  for (const line of lines) {
    // Code block
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code-block', content: codeContent.trimEnd(), language: codeLang });
        inCodeBlock = false;
        codeContent = '';
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    // Heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const { emoji, rest } = extractLeadingEmoji(headingMatch[2]);
      blocks.push({ type: 'heading', content: rest, level: headingMatch[1].length, emoji });
      continue;
    }

    // Separator
    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ type: 'separator', content: '' });
      continue;
    }

    // List item
    if (trimmed.match(/^[-*•]\s+/)) {
      blocks.push({ type: 'list-item', content: trimmed.replace(/^[-*•]\s+/, '') });
      continue;
    }

    // Numbered list
    if (trimmed.match(/^\d+\.\s+/)) {
      blocks.push({ type: 'list-item', content: trimmed.replace(/^\d+\.\s+/, '') });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      blocks.push({ type: 'quote', content: trimmed.replace(/^>\s*/, '') });
      continue;
    }

    // Regular paragraph
    blocks.push({ type: 'paragraph', content: trimmed });
  }

  // Close unclosed code block
  if (inCodeBlock && codeContent) {
    blocks.push({ type: 'code-block', content: codeContent.trimEnd(), language: codeLang });
  }

  return blocks;
}

/** Detect semantic patterns for enhanced rendering. */
function getSectionIcon(text: string): React.ReactNode | null {
  const lower = text.toLowerCase();
  if (lower.includes('attention') || lower.includes('alerte') || lower.includes('warning') || lower.includes('risque')) {
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  }
  if (lower.includes('succès') || lower.includes('positif') || lower.includes('réussi') || lower.includes('bravo')) {
    return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
  }
  if (lower.includes('kpi') || lower.includes('revenue') || lower.includes('chiffre') || lower.includes('performance')) {
    return <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
  }
  if (lower.includes('recommand') || lower.includes('conseil') || lower.includes('suggestion')) {
    return <Info className="w-3.5 h-3.5 text-fuchsia-400" />;
  }
  return null;
}

function getSectionBg(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('attention') || lower.includes('alerte') || lower.includes('warning') || lower.includes('risque')) {
    return 'bg-amber-500/5 border-l-2 border-l-amber-500/30';
  }
  if (lower.includes('succès') || lower.includes('positif') || lower.includes('réussi') || lower.includes('bravo')) {
    return 'bg-emerald-500/5 border-l-2 border-l-emerald-500/30';
  }
  return '';
}

export function AIResponseRenderer({ content }: AIResponseRendererProps) {
  const shouldReduce = useReducedMotion();

  // Short response — plain text
  if (content.length < 80 && !content.includes('#') && !content.includes('-') && !content.includes('*')) {
    return <p className="text-sm text-zinc-200 leading-relaxed">{renderInline(content)}</p>;
  }

  const blocks = parseMarkdown(content);

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        const motionProps = shouldReduce
          ? {}
          : {
              initial: { opacity: 0, y: 6 } as const,
              animate: { opacity: 1, y: 0 } as const,
              transition: { delay: idx * 0.04, duration: 0.25 },
            };

        switch (block.type) {
          case 'heading': {
            const icon = block.emoji || getSectionIcon(block.content);
            const bgClass = getSectionBg(block.content);
            const Tag = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5';
            const sizeClass = block.level === 1
              ? 'text-sm font-semibold text-zinc-100'
              : block.level === 2
                ? 'text-[13px] font-semibold text-zinc-100'
                : 'text-xs font-medium text-zinc-200';

            return (
              <motion.div key={idx} {...motionProps} className={`flex items-center gap-2 pt-2 pb-1 ${bgClass} ${bgClass ? 'px-3 py-2 rounded-lg' : ''}`}>
                {typeof icon === 'string' ? <span className="text-sm">{icon}</span> : icon}
                <Tag className={sizeClass}>{renderInline(block.content)}</Tag>
              </motion.div>
            );
          }

          case 'list-item':
            return (
              <motion.div key={idx} {...motionProps} className="flex items-start gap-2 pl-1">
                <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/60 mt-1.5 flex-shrink-0" />
                <p className="text-[13px] text-zinc-300 leading-relaxed">{renderInline(block.content)}</p>
              </motion.div>
            );

          case 'quote':
            return (
              <motion.div key={idx} {...motionProps} className="border-l-2 border-fuchsia-500/40 pl-3 py-1">
                <p className="text-[13px] text-zinc-300 italic">{renderInline(block.content)}</p>
              </motion.div>
            );

          case 'code-block':
            return (
              <motion.pre key={idx} {...motionProps} className="bg-zinc-900/80 border border-white/[0.06] rounded-lg p-3 overflow-x-auto">
                <code className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre">{block.content}</code>
              </motion.pre>
            );

          case 'separator':
            return <hr key={idx} className="border-white/[0.06] my-2" />;

          case 'paragraph':
          default:
            return (
              <motion.p key={idx} {...motionProps} className="text-[13px] text-zinc-300 leading-relaxed">
                {renderInline(block.content)}
              </motion.p>
            );
        }
      })}
    </div>
  );
}

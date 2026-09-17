import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  serverUrl: string;
  name: string;
  slug?: string;
  fsSlug?: string;
  size?: number;
}

// RomM's platform SVGs carry their colors in a <style> block keyed by CSS
// class (e.g. ".cls-1 { fill: #c1c1c1; }"). react-native-svg's renderer
// doesn't resolve stylesheet classes, so every shape would fall back to the
// SVG default fill of black. Inline each class's declarations onto the
// elements that use it before handing the markup to SvgXml.
export function inlineSvgClasses(svg: string): string {
  const styleMatch = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) {
    return svg;
  }

  const declarationsByClass = new Map<string, string>();
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let rule: RegExpExecArray | null;
  while ((rule = ruleRegex.exec(styleMatch[1]))) {
    const [, selectorList, declarations] = rule;
    const trimmed = declarations.trim();
    if (!trimmed) {
      continue;
    }
    for (const selector of selectorList.split(',')) {
      const className = selector.trim().replace(/^\./, '');
      if (!className) {
        continue;
      }
      const existing = declarationsByClass.get(className);
      declarationsByClass.set(
        className,
        existing ? `${existing};${trimmed}` : trimmed,
      );
    }
  }

  return svg
    .replace(/<style[^>]*>[\s\S]*?<\/style>/i, '')
    .replace(/class="([^"]+)"/g, (match, classNames: string) => {
      const declarations = classNames
        .split(/\s+/)
        .map((name: string) => declarationsByClass.get(name))
        .filter((d: string | undefined): d is string => !!d)
        .join(';');
      return declarations ? `${match} style="${declarations}"` : match;
    });
}

type IconCandidate = { url: string; kind: 'svg' | 'ico' };

// RomM ships most platform icons as .ico and only some as .svg, and its web
// UI (components/common/Platform/PlatformIcon.vue) tries fs_slug then slug,
// .svg before .ico. Since v3.8 the repo also carries a larger vector set
// under assets/platforms/systematic/ that nothing in the web UI references
// but which the Docker image copies verbatim, so it is reachable and is
// preferred over the .ico for the same slug.
export function iconCandidates(
  serverUrl: string,
  slugs: Array<string | undefined>,
): IconCandidate[] {
  const unique = Array.from(
    new Set(
      slugs
        .filter((s): s is string => !!s)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0),
    ),
  );
  const base = `${serverUrl}/assets/platforms`;
  return unique.flatMap(slug => [
    { kind: 'svg', url: `${base}/${slug}.svg` },
    { kind: 'svg', url: `${base}/systematic/${slug}.svg` },
    { kind: 'ico', url: `${base}/${slug}.ico` },
  ]);
}

// A missing asset doesn't always 404: RomM's SPA fallback can answer with
// 200 and index.html, which must not be handed to the SVG renderer.
function looksLikeSvg(text: string): boolean {
  return /<svg[\s>]/i.test(text);
}

// Walk the candidate list in order and fall back to a letter badge when
// none resolve.
export function PlatformIcon({
  serverUrl,
  name,
  slug,
  fsSlug,
  size = 56,
}: Props) {
  const candidates = useMemo(
    () => iconCandidates(serverUrl, [fsSlug, slug]),
    [serverUrl, fsSlug, slug],
  );
  const [attempt, setAttempt] = useState(0);
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    setAttempt(0);
  }, [candidates]);

  const candidate = candidates[attempt];
  const candidateUrl = candidate?.url;
  const candidateKind = candidate?.kind;

  useEffect(() => {
    setXml(null);
    if (!candidateUrl || candidateKind !== 'svg') {
      return;
    }
    let cancelled = false;
    fetch(candidateUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error('icon not found');
        }
        return res.text();
      })
      .then(text => {
        if (cancelled) {
          return;
        }
        if (!looksLikeSvg(text)) {
          throw new Error('not an svg');
        }
        setXml(inlineSvgClasses(text));
      })
      .catch(() => {
        if (!cancelled) {
          setAttempt(a => a + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [candidateUrl, candidateKind]);

  if (!candidate) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: size / 4 },
        ]}
      >
        <Text style={styles.fallbackText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
    );
  }

  if (candidate.kind === 'ico') {
    return (
      <Image
        testID="platform-icon-image"
        source={{ uri: candidate.url }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setAttempt(a => a + 1)}
      />
    );
  }

  if (!xml) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgXml xml={xml} width={size} height={size} />;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceFocused,
  },
  fallbackText: { color: colors.text, fontSize: 22, fontWeight: '700' },
});

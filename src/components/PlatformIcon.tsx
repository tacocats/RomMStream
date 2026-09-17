import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
function inlineSvgClasses(svg: string): string {
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
      declarationsByClass.set(className, existing ? `${existing};${trimmed}` : trimmed);
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

// Try each known slug in turn (fs_slug first, matching RomM's own web UI)
// and fall back to a letter badge if none resolve.
export function PlatformIcon({ serverUrl, name, slug, fsSlug, size = 56 }: Props) {
  const candidates = Array.from(
    new Set([fsSlug, slug].filter((s): s is string => !!s).map(s => s.toLowerCase())),
  );
  const [attempt, setAttempt] = useState(0);
  const [xml, setXml] = useState<string | null>(null);

  const candidate = candidates[attempt];

  useEffect(() => {
    if (!candidate) {
      return;
    }
    let cancelled = false;
    setXml(null);
    fetch(`${serverUrl}/assets/platforms/${candidate}.svg`)
      .then(res => {
        if (!res.ok) {
          throw new Error('icon not found');
        }
        return res.text();
      })
      .then(text => {
        if (!cancelled) {
          setXml(inlineSvgClasses(text));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAttempt(a => a + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [candidate, serverUrl]);

  if (!candidate) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 4 }]}>
        <Text style={styles.fallbackText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
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

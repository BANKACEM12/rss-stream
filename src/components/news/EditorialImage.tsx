import { useState, type SyntheticEvent } from "react";

import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  eager?: boolean;
  /** Shown when `src` fails to load (or is too small) instead of an empty box. */
  fallbackSrc?: string;
};

function highResolutionUrl(src: string) {
  try {
    const url = new URL(src);
    if (url.hostname === "images.skynewsarabia.com") {
      url.pathname = url.pathname.replace(/\/95\/53\//, "/1200/675/");
    }
    if (url.hostname === "ichef.bbci.co.uk") {
      url.pathname = url.pathname.replace(/\/ws\/\d+\//, "/ws/800/");
    }
    return url.toString();
  } catch {
    return src;
  }
}

export function EditorialImage({ src, alt, width, height, className, eager = false, fallbackSrc }: Props) {
  const [hidden, setHidden] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(() => highResolutionUrl(src));
  if (hidden) return null;

  const useFallback = () => {
    if (fallbackSrc) {
      const fb = highResolutionUrl(fallbackSrc);
      if (currentSrc !== fb) {
        setCurrentSrc(fb);
        return;
      }
    }
    setHidden(true);
  };

  const checkQuality = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.naturalWidth < 320 || image.naturalHeight < 180) useFallback();
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onLoad={checkQuality}
      onError={useFallback}
      className={cn("bg-secondary object-cover", className)}
    />
  );
}

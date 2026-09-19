import { useState, type SyntheticEvent } from "react";

import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  eager?: boolean;
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

export function EditorialImage({ src, alt, width, height, className, eager = false }: Props) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const checkQuality = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.naturalWidth < 320 || image.naturalHeight < 180) setHidden(true);
  };

  return (
    <img
      src={highResolutionUrl(src)}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onLoad={checkQuality}
      onError={() => setHidden(true)}
      className={cn("bg-secondary object-cover", className)}
    />
  );
}
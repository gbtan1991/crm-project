import Image from "next/image";

import { cn } from "@/lib/utils";

type MeisterFlowLogoProps = {
  variant?: "full" | "icon";
  className?: string;
  priority?: boolean;
};

const LOGO = {
  full: {
    src: "/meisterflow-logo.png",
    width: 800,
    height: 150,
    alt: "MeisterFlow",
  },
  icon: {
    src: "/meisterflow-logo-square.png",
    width: 1024,
    height: 1024,
    alt: "MeisterFlow",
  },
} as const;

export function MeisterFlowLogo({
  variant = "full",
  className,
  priority,
}: MeisterFlowLogoProps) {
  const logo = LOGO[variant];

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={logo.width}
      height={logo.height}
      priority={priority}
      className={cn(
        variant === "full" ? "h-7 w-auto" : "size-10 rounded-lg",
        className,
      )}
    />
  );
}

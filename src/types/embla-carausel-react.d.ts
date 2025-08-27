declare module "embla-carousel-react" {
    import type { EmblaOptionsType, EmblaPluginType } from "embla-carousel"
    import type { RefObject } from "react"
  
    export type UseEmblaCarouselType = [
      (node: HTMLElement | null) => void,
      any
    ]
  
    export default function useEmblaCarousel(
      options?: EmblaOptionsType,
      plugins?: EmblaPluginType[]
    ): UseEmblaCarouselType
  }
  

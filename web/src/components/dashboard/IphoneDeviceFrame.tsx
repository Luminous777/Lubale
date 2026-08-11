"use client";

import type { ReactNode } from "react";
import { IPhoneMockup } from "react-device-mockup";

/**
 * Marco de smartphone con isla y chasis (botones, sombras) vía **react-device-mockup** (MIT).
 * Maquetación vectorial/CSS del paquete, no imágenes de marca de terceros.
 *
 * @see https://github.com/jung-youngmin/react-device-mockup
 */
export function IphoneDeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[min(100%,480px)] shrink-0 justify-center px-1 sm:px-0">
      <div className="origin-top max-sm:scale-[0.9] [filter:drop-shadow(0_22px_40px_rgba(0,0,0,0.28))_drop-shadow(0_4px_12px_rgba(0,0,0,0.12))]">
        <IPhoneMockup
          screenWidth={375}
          screenType="island"
          frameColor="#3d3d41"
          statusbarColor="#0c0c0c"
          hideNavBar
          hideStatusBar={false}
        >
          <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-[#f2f2f7]">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
              {/* min-h-full: si el contenido es bajo, estira hasta el alto del “cristal” y evita banda gris abajo */}
              <div className="flex min-h-full min-w-0 flex-1 flex-col px-0 py-0">{children}</div>
            </div>
          </div>
        </IPhoneMockup>
      </div>
    </div>
  );
}

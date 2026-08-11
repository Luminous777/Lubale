import type { ReactNode } from "react";

type Props = {
  /** Formulario o panel principal (columna izquierda en escritorio). */
  editor: ReactNode;
  /** Vista previa (columna derecha, fija al hacer scroll). */
  preview: ReactNode;
};

/**
 * Layout estilo Linktree: editor a la izquierda, vista previa a la derecha desde `lg`.
 * En pantallas estrechas la vista previa va arriba para no quedar “al final”.
 */
export function EditorSidePreviewLayout({ editor, preview }: Props) {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_min(500px,48vw)] lg:items-start lg:gap-8">
      <div className="order-2 min-w-0 lg:order-1">{editor}</div>
      <aside className="order-1 w-full min-w-0 justify-self-center lg:order-2 lg:sticky lg:top-4 lg:w-full lg:max-w-[500px] lg:justify-self-end lg:self-start">
        {preview}
      </aside>
    </div>
  );
}

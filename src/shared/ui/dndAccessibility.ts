// Ciche a11y dla @dnd-kit.
//
// WHY: dnd-kit domyślnie wstrzykuje do DOM angielskie komunikaty live-region
// ("Draggable item digit-9 was dropped over droppable area…") oraz instrukcję
// obsługi klawiaturą. UI dziecka jest sterowane audio i w całości po polsku —
// czytnik ekranu (VoiceOver na iPadzie) przeczytałby te zdania po angielsku
// w środku ćwiczenia. Wyciszamy je: brak announcementów, pusta instrukcja.

import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core'

export const SILENT_ANNOUNCEMENTS: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
}

const SILENT_INSTRUCTIONS: ScreenReaderInstructions = { draggable: '' }

/** Podaj jako `<DndContext accessibility={SILENT_DND_ACCESSIBILITY}>`. */
export const SILENT_DND_ACCESSIBILITY = {
  announcements: SILENT_ANNOUNCEMENTS,
  screenReaderInstructions: SILENT_INSTRUCTIONS,
} as const

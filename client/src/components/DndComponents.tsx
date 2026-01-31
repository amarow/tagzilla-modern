import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Box } from '@mantine/core';

// Ein Tag in der Sidebar, der gezogen werden kann UND ein Ziel für Files ist
export function TagItem({ tag, children, isSelected, onClick }: any) {
  // Draggable Setup (Wir ziehen den Tag)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `tag-${tag.id}`,
    data: { type: 'TAG', id: tag.id, name: tag.name }
  });

  // Droppable Setup (Wir lassen ein File hier fallen)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `tag-target-${tag.id}`,
    data: { type: 'TAG_TARGET', id: tag.id, name: tag.name }
  });

  // Combine refs is tricky via callback ref
  const setRefs = (element: HTMLElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  const style = {
    opacity: isDragging ? 0.5 : 1,
    border: isOver ? '2px dashed #228be6' : '1px solid transparent', // Visual feedback when hovering with file
    borderRadius: '4px',
    cursor: 'grab'
  };

  return (
    <div ref={setRefs} style={style} {...listeners} {...attributes} onClick={onClick}>
      {children}
    </div>
  );
}

// Eine Dateizeile, die gezogen werden kann UND ein Ziel für Tags ist
export function FileRow({ file, children }: any) {
  // Draggable Setup (Wir ziehen das File)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `file-${file.id}`,
    data: { type: 'FILE', id: file.id, name: file.name }
  });

  // Droppable Setup (Wir lassen einen Tag hier fallen)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `file-target-${file.id}`,
    data: { type: 'FILE_TARGET', id: file.id, name: file.name }
  });

  const setRefs = (element: HTMLElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  const style = {
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isOver ? 'rgba(34, 139, 230, 0.1)' : undefined, // Visual feedback when hovering with tag
  };

  return (
    <tr ref={setRefs} style={style} {...attributes} {...listeners}>
      {children}
    </tr>
  );
}

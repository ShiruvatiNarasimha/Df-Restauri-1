import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Grip, X } from "lucide-react";

interface Image {
  id: string;
  url: string;
}

interface SortableImageProps {
  image: Image;
  onRemove: (id: string) => void;
}

function SortableImage({ image, onRemove }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-white rounded-lg border mb-2 ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="cursor-grab"
        {...attributes}
        {...listeners}
      >
        <Grip className="h-4 w-4" />
      </Button>
      <div className="relative h-20 w-20 shrink-0">
        <img
          src={image.url}
          alt="Gallery"
          className="h-full w-full object-cover rounded-md"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto text-destructive hover:text-destructive"
        onClick={() => onRemove(image.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ImageOrderListProps {
  images: Image[];
  onChange: (images: Image[]) => void;
}

export function ImageOrderList({ images, onChange }: ImageOrderListProps) {
  const [items, setItems] = useState<Image[]>(images);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        onChange(newItems);
        return newItems;
      });
    }
  };

  const handleRemove = (id: string) => {
    setItems((items) => {
      const newItems = items.filter((item) => item.id !== id);
      onChange(newItems);
      return newItems;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((image) => (
            <SortableImage
              key={image.id}
              image={image}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

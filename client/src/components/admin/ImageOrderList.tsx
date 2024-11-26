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
  order?: number;
  isPreview?: boolean;
}

interface SortableImageProps {
  image: Image;
  onRemove: (id: string) => void;
  onPreview: (url: string) => void;
}

function SortableImage({ image, onRemove, onPreview }: SortableImageProps) {
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
        isDragging ? "shadow-lg border-primary" : ""
      } ${image.isPreview ? "opacity-50" : ""}`}
    >
      <Button
        variant="ghost"
        size="icon"
        className="cursor-grab hover:bg-primary/10"
        {...attributes}
        {...listeners}
      >
        <Grip className="h-4 w-4" />
      </Button>
      <div 
        className="relative h-20 w-20 shrink-0 overflow-hidden group cursor-pointer"
        onClick={() => onPreview(image.url)}
      >
        <img
          src={image.url}
          alt="Gallery"
          className="h-full w-full object-cover rounded-md transition-transform group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs">Preview</span>
        </div>
      </div>
      <div className="ml-4 flex-grow">
        <p className="text-sm font-medium truncate">{image.id}</p>
        <p className="text-xs text-muted-foreground">Order: {image.order || 'Unset'}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
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
  onImageUpload?: (files: FileList) => void;
}

export function ImageOrderList({ images, onChange, onImageUpload }: ImageOrderListProps) {
  const [items, setItems] = useState<Image[]>(images);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
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

        const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          order: index + 1,
        }));
        
        onChange(newItems);
        return newItems;
      });
    }
  };

  const handleDragStart = () => {
    if (typeof window.navigator.vibrate === "function") {
      window.navigator.vibrate(100);
    }
  };

  const handleRemove = (id: string) => {
    setItems((items) => {
      const newItems = items.filter((item) => item.id !== id).map((item, index) => ({
        ...item,
        order: index + 1,
      }));
      onChange(newItems);
      return newItems;
    });
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
  };

  return (
    <>
      <div className="mb-4">
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          id="image-upload"
          onChange={(e) => onImageUpload?.(e.target.files!)}
        />
        <label htmlFor="image-upload">
          <div className="border-2 border-dashed border-primary/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors">
            <p className="text-sm text-muted-foreground">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports: JPG, PNG, WebP (Max 5MB)
            </p>
          </div>
        </label>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((image) => (
              <SortableImage
                key={image.id}
                image={image}
                onRemove={handleRemove}
                onPreview={handlePreview}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-3xl max-h-[80vh] p-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}

import { useQuery } from "@tanstack/react-query";
import { safeBakePhotoQueries } from "@/lib/safeQueries";
import { safeMap } from "@/lib/safeArray";
import { Camera, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { BakePhoto } from "@shared/schema";
import { safeParseDate } from "@/lib/utils";

interface PhotoGalleryProps {
  bakeId: string;
  className?: string;
}

interface BakePhotoWithUrl extends BakePhoto {
  url: string;
}

export default function PhotoGallery({ bakeId, className = "" }: PhotoGalleryProps) {
  const { data: photos, isLoading, error } = useQuery({
    queryKey: ["bake-photos", bakeId],
    queryFn: () => safeBakePhotoQueries.getByBakeId(bakeId),
    enabled: !!bakeId,
  });

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm font-medium text-sourdough-800">Bake Photos</div>
        <div className="flex items-center justify-center p-8 bg-sourdough-50 rounded-lg">
          <div className="text-center text-sourdough-600">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading photos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm font-medium text-sourdough-800">Bake Photos</div>
        <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg">
          <div className="text-center text-red-600">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load photos</p>
          </div>
        </div>
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-sm font-medium text-sourdough-800">Bake Photos</div>
        <div className="flex items-center justify-center p-8 bg-sourdough-50 rounded-lg">
          <div className="text-center text-sourdough-600">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No photos yet</p>
            <p className="text-xs opacity-75 mt-1">Capture your baking progress!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-sourdough-800">
        Bake Photos ({photos.length})
      </div>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {safeMap(photos, (photo) => {
          const photoWithUrl = photo as BakePhotoWithUrl;
          return (
          <Card key={photoWithUrl.id} className="overflow-hidden border-sourdough-200">
            <CardContent className="p-0">
              <div className="aspect-square relative group">
                <img
                  src={photoWithUrl.url}
                  alt={photoWithUrl.caption || "Bake progress photo"}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk3YTNiNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=";
                  }}
                />
                
                {/* Overlay with photo info */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="text-white text-xs">
                    {photoWithUrl.caption && (
                      <p className="font-medium truncate">{photoWithUrl.caption}</p>
                    )}
                    <p className="opacity-75">
                      {(() => {
                        const createdDate = safeParseDate(photoWithUrl.createdAt);
                        return createdDate && !isNaN(createdDate.getTime())
                          ? createdDate.toLocaleDateString()
                          : 'Unknown date';
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>
    </div>
  );
}
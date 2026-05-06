import { useState, useRef } from "react";
import {
  Edit2,
  Trash2,
  X,
  ImageIcon,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ListItem } from "../utils/api";
import { toast } from "sonner";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { ImageModal } from "./ImageModal";
import { ConfirmationModal } from "./ConfirmationModal";
import { LazyPhoto } from "./LazyPhoto";
import { Card, CardContent } from "./ui/Card";
import primaryButtonBg from "figma:asset/85f171ff8cd9cb4f7140b1d04b0f2e0ecceb0615.png";
import secondaryButtonBg from "figma:asset/75c872bdf2a28b8670edf0ef3851acf422588625.png";

interface Top3ItemComponentProps {
  item: ListItem;
  onUpdate: (updatedItem: ListItem) => void;
  onDelete: () => void;
}

export function Top3ItemComponent({
  item,
  onUpdate,
  onDelete,
}: Top3ItemComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] =
    useState(false);
  const [showPhotoView, setShowPhotoView] = useState(false);
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] =
    useState(false);
  const [photoUrl, setPhotoUrl] = useState(item.photo || "");
  const [loadedPhotoForModal, setLoadedPhotoForModal] =
    useState<string>("");
  const [mateusValues, setMateusValues] = useState({
    position1: item.top3Mateus?.position1 || "",
    position2: item.top3Mateus?.position2 || "",
    position3: item.top3Mateus?.position3 || "",
  });
  const [amandaValues, setAmandaValues] = useState({
    position1: item.top3Amanda?.position1 || "",
    position2: item.top3Amanda?.position2 || "",
    position3: item.top3Amanda?.position3 || "",
  });

  // Determine background color based on creator
  const isAmanda = item.createdBy === "Amanda";
  const isMateus = item.createdBy === "Mateus";
  const cardBackgroundClass = isAmanda
    ? "bg-purple-50"
    : isMateus
      ? "bg-gray-50"
      : "bg-white";

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result || typeof result !== "string") {
          reject(new Error("Failed to read file"));
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;
            const maxSize = 1200;

            if (width > height && width > maxSize) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else if (height > maxSize) {
              width = (width / height) * maxSize;
              height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Failed to get canvas context"));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL(
              "image/jpeg",
              0.7,
            );

            if (compressedDataUrl.length > 2800000) {
              const lowerQuality = canvas.toDataURL(
                "image/jpeg",
                0.5,
              );
              resolve(lowerQuality);
            } else {
              resolve(compressedDataUrl);
            }
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = (error) => {
          reject(new Error("Failed to load image"));
        };
        img.src = result;
      };
      reader.onerror = (error) => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 10) {
        toast.error("Imagem muito grande. Máximo 10MB");
        return;
      }

      try {
        toast.info("Comprimindo imagem...");
        const compressed = await compressImage(file);

        const compressedSizeMB =
          compressed.length / (1024 * 1024);
        if (compressedSizeMB > 2) {
          toast.warning(
            "Imagem ainda grande após compressão. Pode haver problemas ao salvar.",
          );
        } else {
          toast.success("Imagem adicionada!");
        }

        setPhotoUrl(compressed);
      } catch (error) {
        console.error("Error compressing image:", error);
        toast.error("Erro ao processar imagem");
      }
    }
  };

  const handleSave = () => {
    const updatedItem: ListItem = {
      ...item,
      photo: photoUrl || null,
      top3Mateus: mateusValues,
      top3Amanda: amandaValues,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updatedItem);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPhotoUrl(item.photo || "");
    setMateusValues({
      position1: item.top3Mateus?.position1 || "",
      position2: item.top3Mateus?.position2 || "",
      position3: item.top3Mateus?.position3 || "",
    });
    setAmandaValues({
      position1: item.top3Amanda?.position1 || "",
      position2: item.top3Amanda?.position2 || "",
      position3: item.top3Amanda?.position3 || "",
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete();
    setIsEditing(false);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    setShowRemovePhotoConfirm(false);
  };

  return (
    <>
      <Card
        variant="white"
        className={`overflow-visible ${cardBackgroundClass}`}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-[#2B2A28]">
                {item.title}
              </h3>
              {/* Favorite Star - Only visible when favorited */}
              {item.isFavorite && (
                <Star
                  className="w-5 h-5 text-[#FFD700] fill-[#FFD700]"
                  strokeWidth={1.5}
                  style={{ stroke: "#000000" }}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-[#F8F6F3] rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-[#2B2A28]" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Top 3 do Mateus */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-[#2B2A28]">
                  Top 3 do Mateus
                </span>
              </div>

              <div className="space-y-2">
                {/* Posição 2 */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                    2
                  </span>
                  <span className="flex-1 text-base font-medium text-[#8A847D]">
                    {mateusValues.position2 || "—"}
                  </span>
                </div>

                {/* Posição 1 */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                    1
                  </span>
                  <span className="flex-1 text-base font-semibold text-[#8A847D]">
                    {mateusValues.position1 || "—"}
                  </span>
                </div>

                {/* Posição 3 */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                    3
                  </span>
                  <span className="flex-1 text-base font-medium text-[#8A847D]">
                    {mateusValues.position3 || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-[#E8E4DF]" />

            {/* Top 3 da Amanda */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-[#2B2A28]">
                  Top 3 da Amanda
                </span>
              </div>

              <div className="space-y-2">
                {/* Posição 2 */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                    2
                  </span>
                  <span className="flex-1 text-base font-medium text-[#8A847D]">
                    {amandaValues.position2 || "—"}
                  </span>
                </div>

                {/* Posição 1 */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                    1
                  </span>
                  <span className="flex-1 text-base font-semibold text-[#8A847D]">
                    {amandaValues.position1 || "—"}
                  </span>
                </div>

                {/* Posição 3 */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                    3
                  </span>
                  <span className="flex-1 text-base font-medium text-[#8A847D]">
                    {amandaValues.position3 || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Display */}
            {(item.photo === "HAS_PHOTO" ||
              (item.photo &&
                item.photo.startsWith("data:"))) && (
              <div
                className="mt-4 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  if (loadedPhotoForModal) {
                    setShowPhotoView(true);
                  }
                }}
              >
                {item.photo === "HAS_PHOTO" ? (
                  <LazyPhoto
                    itemId={item.id}
                    hasPhoto={true}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-xl"
                    onLoad={(photo) => {
                      if (photo) {
                        setLoadedPhotoForModal(photo);
                      }
                    }}
                  />
                ) : (
                  <img
                    src={item.photo || ""}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-xl"
                    onLoad={() =>
                      setLoadedPhotoForModal(item.photo || "")
                    }
                  />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal - Full Screen */}
      <AnimatePresence>
        {isEditing && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="fixed inset-0 bg-black/50 z-[60]"
              style={{
                maxWidth: "100vw",
                left: 0,
                right: 0,
                margin: 0,
              }}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 300,
              }}
              className="fixed left-0 right-0 bg-background z-[70] flex flex-col rounded-t-3xl shadow-2xl max-h-[90vh]"
              style={{
                bottom: 0,
                maxWidth: 390,
                margin: "0 auto",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-xl font-semibold text-[#2B2A28]">
                  {item.title}
                </h2>
                <div className="flex items-center gap-2">
                  {/* Botão de favorito */}
                  <button
                    onClick={() => {
                      const updatedItem = {
                        ...item,
                        isFavorite: !item.isFavorite,
                      };
                      onUpdate(updatedItem);
                      toast.success(
                        item.isFavorite
                          ? "Removido dos favoritos"
                          : "Adicionado aos favoritos",
                      );
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/30 transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 transition-all ${
                        item.isFavorite
                          ? "text-[#FFD700] fill-[#FFD700]"
                          : "text-[#8A847D]"
                      }`}
                      strokeWidth={1.5}
                      style={
                        item.isFavorite
                          ? { stroke: "#000000" }
                          : undefined
                      }
                    />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-[#F8F6F3] rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-[#2B2A28]" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  {/* Top 3 do Mateus */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-base font-medium text-[#2B2A28]">
                        Top 3 do Mateus
                      </label>
                    </div>

                    <div className="space-y-2">
                      {/* Posição 2 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                          2
                        </span>
                        <input
                          type="text"
                          value={mateusValues.position2}
                          onChange={(e) =>
                            setMateusValues({
                              ...mateusValues,
                              position2: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] font-medium placeholder:text-[#95A5A6]"
                          placeholder="Segunda posição"
                        />
                      </div>

                      {/* Posição 1 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                          1
                        </span>
                        <input
                          type="text"
                          value={mateusValues.position1}
                          onChange={(e) =>
                            setMateusValues({
                              ...mateusValues,
                              position1: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] font-semibold placeholder:text-[#95A5A6]"
                          placeholder="Primeira posição"
                        />
                      </div>

                      {/* Posição 3 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                          3
                        </span>
                        <input
                          type="text"
                          value={mateusValues.position3}
                          onChange={(e) =>
                            setMateusValues({
                              ...mateusValues,
                              position3: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] font-medium placeholder:text-[#95A5A6]"
                          placeholder="Terceira posição"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Divisor */}
                  <div className="border-t border-[#E8E4DF]" />

                  {/* Top 3 da Amanda */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-base font-medium text-[#2B2A28]">
                        Top 3 da Amanda
                      </label>
                    </div>

                    <div className="space-y-2">
                      {/* Posição 2 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                          2
                        </span>
                        <input
                          type="text"
                          value={amandaValues.position2}
                          onChange={(e) =>
                            setAmandaValues({
                              ...amandaValues,
                              position2: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] font-medium placeholder:text-[#95A5A6]"
                          placeholder="Segunda posição"
                        />
                      </div>

                      {/* Posição 1 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                          1
                        </span>
                        <input
                          type="text"
                          value={amandaValues.position1}
                          onChange={(e) =>
                            setAmandaValues({
                              ...amandaValues,
                              position1: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] font-semibold placeholder:text-[#95A5A6]"
                          placeholder="Primeira posição"
                        />
                      </div>

                      {/* Posição 3 */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#2B2A28] w-4 flex-shrink-0">
                          3
                        </span>
                        <input
                          type="text"
                          value={amandaValues.position3}
                          onChange={(e) =>
                            setAmandaValues({
                              ...amandaValues,
                              position3: e.target.value,
                            })
                          }
                          className="flex-1 px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] font-medium placeholder:text-[#95A5A6]"
                          placeholder="Terceira posição"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="text-base font-medium mb-3 block flex items-center gap-2 text-[#2B2A28]">
                      <ImageIcon className="w-5 h-5" />
                      Imagem
                    </label>
                    <div className="relative">
                      <input
                        id="photo-upload-top3"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="photo-upload-top3"
                        className="w-full px-4 py-3 rounded-xl border border-[#E8E4DF] bg-[#F8F6F3] hover:bg-[#F0EDE9] transition-colors cursor-pointer flex items-center justify-center gap-2 text-[#2B2A28]"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <span>
                          {photoUrl
                            ? "Foto selecionada"
                            : "Incluir foto"}
                        </span>
                      </label>
                      {photoUrl && (
                        <div className="mt-3 relative rounded-xl overflow-hidden">
                          <img
                            src={photoUrl}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-xl"
                          />
                          <button
                            onClick={() =>
                              setShowRemovePhotoConfirm(true)
                            }
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Fixed Buttons */}
              <div className="px-6 py-4 border-t border-border bg-background">
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setShowDeleteConfirmation(true)
                    }
                    className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
                    style={{
                      backgroundImage: `url(${secondaryButtonBg})`,
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                    style={{
                      backgroundImage: `url(${primaryButtonBg})`,
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDelete}
        itemTitle={item.title}
      />

      {/* Photo View Modal */}
      <ImageModal
        isOpen={showPhotoView}
        onClose={() => setShowPhotoView(false)}
        photoUrl={loadedPhotoForModal || item.photo || ""}
        title={item.title}
        createdBy={item.createdBy}
        createdAt={item.createdAt}
      />

      {/* Remove Photo Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemovePhotoConfirm}
        onClose={() => setShowRemovePhotoConfirm(false)}
        onConfirm={handleRemovePhoto}
        title="Remover Foto"
        message="Tem certeza de que deseja remover a foto?"
      />
    </>
  );
}
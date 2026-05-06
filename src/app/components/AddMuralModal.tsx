import { useState } from 'react';
import { X, Image as ImageIcon, Video, Mic, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import primaryButtonBg from "figma:asset/85f171ff8cd9cb4f7140b1d04b0f2e0ecceb0615.png";
import secondaryButtonBg from "figma:asset/75c872bdf2a28b8670edf0ef3851acf422588625.png";

interface AddMuralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, contentType: 'text' | 'image' | 'video' | 'audio', content: string, caption?: string) => void;
}

type ContentType = 'text' | 'image' | 'video' | 'audio';

export function AddMuralModal({ isOpen, onClose, onAdd }: AddMuralModalProps) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text');
  const [textContent, setTextContent] = useState('');
  const [mediaFile, setMediaFile] = useState<string>('');
  const [caption, setCaption] = useState(''); // Caption para posts de imagem
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
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
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          if (compressedDataUrl.length > 2800000) {
            const lowerQuality = canvas.toDataURL('image/jpeg', 0.5);
            resolve(lowerQuality);
          } else {
            resolve(compressedDataUrl);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    
    if (contentType === 'image') {
      if (fileSizeMB > 10) {
        toast.error('Imagem muito grande. Máximo 10MB');
        return;
      }

      try {
        toast.info('Processando imagem...');
        const compressed = await compressImage(file);
        setMediaFile(compressed);
        toast.success('Imagem adicionada!');
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error('Erro ao processar imagem');
      }
    } else if (contentType === 'video') {
      if (fileSizeMB > 50) {
        toast.error('Vídeo muito grande. Máximo 50MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaFile(e.target?.result as string);
        toast.success('Vídeo adicionado!');
      };
      reader.readAsDataURL(file);
    } else if (contentType === 'audio') {
      if (fileSizeMB > 10) {
        toast.error('Áudio muito grande. Máximo 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaFile(e.target?.result as string);
        toast.success('Áudio adicionado!');
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          setMediaFile(reader.result as string);
          toast.success('Áudio gravado!');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info('Gravando áudio...');
    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Permissão negada. Use o botão "Fazer upload" abaixo para adicionar um arquivo de áudio.');
        } else if (error.name === 'NotFoundError') {
          toast.error('Nenhum microfone encontrado.');
        } else if (error.name === 'NotReadableError') {
          toast.error('Microfone já está em uso.');
        } else {
          toast.error('Erro ao acessar microfone. Tente novamente.');
        }
      } else {
        toast.error('Erro ao acessar microfone');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = () => {
    // Validar título obrigatório
    if (!title.trim()) {
      toast.error('Digite um título');
      return;
    }

    if (contentType === 'text' && !textContent.trim()) {
      toast.error('Digite um texto');
      return;
    }

    if (contentType !== 'text' && !mediaFile) {
      toast.error('Adicione uma mídia');
      return;
    }

    const content = contentType === 'text' ? textContent : mediaFile;
    
    onAdd(title.trim(), contentType, content, caption);
    
    // Reset
    setTitle('');
    setTextContent('');
    setMediaFile('');
    setCaption('');
    setContentType('text');
    onClose();
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    setTitle('');
    setTextContent('');
    setMediaFile('');
    setCaption('');
    setContentType('text');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 z-[60]"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 left-1/2 -translate-x-1/2 w-full bg-background z-[70] flex flex-col"
            style={{ maxWidth: 390 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-semibold text-[#2B2A28]">Novo Post no Mural</h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-[#F8F6F3] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#2B2A28]" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {/* Title - OBRIGATÓRIO */}
                <div>
                  <label className="text-sm font-medium mb-2 block text-[#2B2A28]">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Digite um título..."
                    className="w-full px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] placeholder:text-[#95A5A6]"
                  />
                </div>

                {/* Content Type Selector */}
                <div>
                  <label className="text-sm font-medium mb-3 block text-[#2B2A28]">
                    Tipo de conteúdo
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setContentType('text');
                        setMediaFile('');
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        contentType === 'text'
                          ? 'border-[#81D8D0] bg-[#81D8D0]/10'
                          : 'border-[#E8E4DF] bg-[#F8F6F3] hover:border-[#81D8D0]/50'
                      }`}
                    >
                      <Type className="w-5 h-5 text-[#2B2A28]" />
                      <span className="text-xs font-medium text-[#2B2A28]">Texto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setContentType('image');
                        setTextContent('');
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        contentType === 'image'
                          ? 'border-[#81D8D0] bg-[#81D8D0]/10'
                          : 'border-[#E8E4DF] bg-[#F8F6F3] hover:border-[#81D8D0]/50'
                      }`}
                    >
                      <ImageIcon className="w-5 h-5 text-[#2B2A28]" />
                      <span className="text-xs font-medium text-[#2B2A28]">Imagem</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setContentType('video');
                        setTextContent('');
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        contentType === 'video'
                          ? 'border-[#81D8D0] bg-[#81D8D0]/10'
                          : 'border-[#E8E4DF] bg-[#F8F6F3] hover:border-[#81D8D0]/50'
                      }`}
                    >
                      <Video className="w-5 h-5 text-[#2B2A28]" />
                      <span className="text-xs font-medium text-[#2B2A28]">Vídeo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setContentType('audio');
                        setTextContent('');
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        contentType === 'audio'
                          ? 'border-[#81D8D0] bg-[#81D8D0]/10'
                          : 'border-[#E8E4DF] bg-[#F8F6F3] hover:border-[#81D8D0]/50'
                      }`}
                    >
                      <Mic className="w-5 h-5 text-[#2B2A28]" />
                      <span className="text-xs font-medium text-[#2B2A28]">Áudio</span>
                    </button>
                  </div>
                </div>

                {/* Content Input */}
                <div>
                  {contentType === 'text' && (
                    <div>
                      <label className="text-sm font-medium mb-2 block text-[#2B2A28]">
                        Conteúdo
                      </label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Digite seu texto..."
                        rows={6}
                        className="w-full px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] placeholder:text-[#95A5A6] resize-none"
                      />
                      {textContent && (
                        <div className="mt-2 text-xs text-[#8A847D]">
                          {textContent.length} caracteres
                        </div>
                      )}
                    </div>
                  )}

                  {(contentType === 'image' || contentType === 'video') && (
                    <div>
                      <label className="text-sm font-medium mb-2 block text-[#2B2A28]">
                        {contentType === 'image' ? 'Imagem' : 'Vídeo'}
                      </label>
                      <input
                        id="media-upload"
                        type="file"
                        accept={contentType === 'image' ? 'image/*' : 'video/*'}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="media-upload"
                        className="w-full px-4 py-8 rounded-xl border-2 border-dashed border-[#E8E4DF] bg-[#F8F6F3] hover:bg-[#F0EDE9] transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 text-[#2B2A28]"
                      >
                        {contentType === 'image' ? (
                          <ImageIcon className="w-8 h-8" />
                        ) : (
                          <Video className="w-8 h-8" />
                        )}
                        <span className="text-sm font-medium">
                          {mediaFile
                            ? 'Arquivo selecionado'
                            : `Clique para selecionar ${contentType === 'image' ? 'imagem' : 'vídeo'}`}
                        </span>
                      </label>
                      {mediaFile && (
                        <div className="mt-3 relative rounded-xl overflow-hidden bg-[#F8F6F3]">
                          {contentType === 'image' ? (
                            <img src={mediaFile} alt="Preview" className="w-full h-48 object-cover" />
                          ) : (
                            <div className="relative">
                              <video src={mediaFile} className="w-full h-48 object-cover" />
                              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                Preview do vídeo
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => setMediaFile('')}
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {contentType === 'audio' && (
                    <div>
                      <label className="text-sm font-medium mb-2 block text-[#2B2A28]">
                        Áudio
                      </label>
                      {!mediaFile ? (
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-full px-4 py-8 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
                              isRecording
                                ? 'border-red-500 bg-red-50 animate-pulse'
                                : 'border-dashed border-[#E8E4DF] bg-[#F8F6F3] hover:bg-[#F0EDE9]'
                            }`}
                          >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                              isRecording ? 'bg-red-500' : 'bg-[#81D8D0]'
                            }`}>
                              <Mic className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-sm font-medium text-[#2B2A28]">
                              {isRecording ? 'Clique para parar' : 'Clique para gravar'}
                            </span>
                          </button>
                          
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-[#E8E4DF]"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                              <span className="bg-background px-2 text-[#95A5A6]">ou</span>
                            </div>
                          </div>
                          
                          <input
                            id="audio-upload"
                            type="file"
                            accept="audio/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="audio-upload"
                            className="w-full px-4 py-3 rounded-xl border border-[#E8E4DF] bg-[#F8F6F3] hover:bg-[#F0EDE9] transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm font-medium text-[#2B2A28]"
                          >
                            <ImageIcon className="w-4 h-4" />
                            Fazer upload de arquivo
                          </label>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <audio src={mediaFile} controls className="w-full" />
                          <button
                            type="button"
                            onClick={() => setMediaFile('')}
                            className="w-full px-4 py-2 rounded-xl border border-[#E8E4DF] bg-[#F8F6F3] hover:bg-[#F0EDE9] transition-colors text-sm font-medium text-[#2B2A28]"
                          >
                            Gravar novamente
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Caption para posts de imagem */}
                {contentType === 'image' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block text-[#2B2A28]">
                      Legenda
                    </label>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Digite uma legenda..."
                      className="w-full px-4 py-3 bg-[#F8F6F3] rounded-xl border border-[#E8E4DF] focus:border-[#81D8D0] focus:outline-none focus:ring-2 focus:ring-[#81D8D0]/20 text-sm text-[#2B2A28] placeholder:text-[#95A5A6]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed Buttons */}
            <div className="px-6 py-4 border-t border-border bg-background">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                  style={{ backgroundImage: `url(${secondaryButtonBg})` }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isRecording}
                  className="flex-1 h-12 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity flex items-center justify-center disabled:opacity-50"
                  style={{ backgroundImage: `url(${primaryButtonBg})` }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
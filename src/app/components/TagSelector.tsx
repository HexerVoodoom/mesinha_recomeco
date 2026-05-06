import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tag } from 'lucide-react';
import primaryButtonBg from "figma:asset/85f171ff8cd9cb4f7140b1d04b0f2e0ecceb0615.png";
import secondaryButtonBg from "figma:asset/75c872bdf2a28b8670edf0ef3851acf422588625.png";

interface TagSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTags: string[];
  onSaveTags: (tags: string[]) => void;
  allItems: any[]; // Para calcular a contagem de tags
}

export function TagSelector({ isOpen, onClose, selectedTags, onSaveTags, allItems }: TagSelectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTags);

  useEffect(() => {
    setLocalSelectedTags(selectedTags);
  }, [selectedTags, isOpen]);

  // Calcular contagem de tags de todos os itens
  const getTagCounts = () => {
    const counts: Record<string, number> = {};
    if (!allItems || !Array.isArray(allItems)) {
      return counts;
    }
    allItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return counts;
  };

  const tagCounts = getTagCounts();
  const existingTags = Object.keys(tagCounts).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Filtrar tags existentes que não estão selecionadas e correspondem ao input
  const suggestedTags = inputValue.trim() 
    ? existingTags.filter(tag => 
        !localSelectedTags.includes(tag) && 
        tag.toLowerCase().includes(inputValue.toLowerCase())
      )
    : [];

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !localSelectedTags.includes(trimmedTag)) {
      setLocalSelectedTags([...localSelectedTags, trimmedTag]);
      setInputValue('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setLocalSelectedTags(localSelectedTags.filter(t => t !== tag));
  };

  const handleSave = () => {
    onSaveTags(localSelectedTags);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
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
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
            style={{ maxWidth: 390, margin: '0 auto' }}
          />

          {/* Close Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onClose}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
            style={{ maxWidth: 390 }}
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-card rounded-t-3xl z-50 border-t-2 border-[#4D989B]/10 max-h-[85vh] overflow-hidden flex flex-col"
            style={{ 
              maxWidth: 390,
              boxShadow: '0 -4px 20px rgba(77, 152, 155, 0.08), 0 -1px 4px rgba(77, 152, 155, 0.04)'
            }}
          >
            <div className="px-6 py-6 flex flex-col flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-6">
                <Tag className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-medium">Gerenciar Tags</h2>
              </div>

              {/* Selected Tags */}
              {localSelectedTags.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block text-muted-foreground">Tags selecionadas</label>
                  <div className="flex flex-wrap gap-2">
                    {localSelectedTags.map(tag => (
                      <div 
                        key={tag}
                        className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="mb-4">
                <label className="text-base font-medium mb-2 block">Nova tag</label>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite o nome da tag..."
                      className="flex-1 px-4 py-3 rounded-xl border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddTag(inputValue)}
                      disabled={!inputValue.trim()}
                      className="px-5 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Adicionar
                    </button>
                  </div>

                  {/* Dropdown de Sugestões */}
                  {suggestedTags.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 right-[90px] mt-1 bg-white border-2 border-border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto"
                    >
                      {suggestedTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleAddTag(tag)}
                          className="w-full px-4 py-2.5 text-left hover:bg-primary/10 transition-colors flex items-center justify-between group"
                        >
                          <span className="font-medium text-foreground">{tag}</span>
                          <span className="text-sm text-muted-foreground group-hover:text-primary">
                            ({tagCounts[tag]})
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Dica de uso */}
              {localSelectedTags.length === 0 && !inputValue && (
                <div className="text-sm text-muted-foreground text-center py-4 px-4 bg-muted/20 rounded-xl">
                  💡 Comece a digitar para ver sugestões de tags existentes
                </div>
              )}

            </div>

            {/* Actions - Fixed at bottom */}
            <div className="flex gap-3 px-6 py-4 border-t border-border bg-card">
              <button
                onClick={onClose}
                className="flex-1 h-11 relative bg-contain bg-center bg-no-repeat text-foreground font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                style={{ backgroundImage: `url(${secondaryButtonBg})` }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 h-11 relative bg-contain bg-center bg-no-repeat text-white font-medium hover:opacity-80 transition-opacity flex items-center justify-center"
                style={{ backgroundImage: `url(${primaryButtonBg})` }}
              >
                Salvar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
# Ícones do App Mesinha 💕

## ⚠️ IMPORTANTE: Gerar Ícones PNG

Os ícones PNG ainda precisam ser gerados! Siga estes passos:

### Opção 1: Usando a Página de Geração (Recomendado)
1. Abra no navegador: `http://localhost:5173/generate-icons.html`
2. Clique em "🎯 Gerar Todos os Ícones"
3. Os arquivos PNG serão baixados automaticamente
4. Mova os arquivos para a pasta `/public`:
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `icon-192x192.png`
   - `icon-512x512.png`

### Opção 2: Manualmente no Código
```typescript
import { downloadIcon } from './utils/generateIcons';

// Baixar todos os tamanhos
await downloadIcon(16, 'favicon-16x16.png');
await downloadIcon(32, 'favicon-32x32.png');
await downloadIcon(192, 'icon-192x192.png');
await downloadIcon(512, 'icon-512x512.png');
```

## Arquivos de Ícones

### Ícones PNG (Precisam ser gerados)
- `favicon-16x16.png` - Favicon pequeno
- `favicon-32x32.png` - Favicon padrão
- `icon-192x192.png` - Ícone PWA médio
- `icon-512x512.png` - Ícone PWA grande

### Ícones SVG (Já existem)
- `icon.svg` - Ícone principal 512x512 com a ilustração fofa do casal
- `icon-192.svg` - Versão 192x192 para PWA
- `favicon.svg` - Favicon 32x32

### Ícone Fallback
- `icon-fallback.svg` - Versão simplificada ilustrada para casos onde o asset do Figma não carrega

## Cores Utilizadas
- **Tiffany Blue (Primary)**: `#81D8D0`
- **Tiffany Blue (Dark)**: `#4D989B`
- **Background**: `#F8F6F3`

## Manifest PWA
O arquivo `manifest.json` configura o app como Progressive Web App com:
- Nome: "Mesinha - Listas Compartilhadas"
- Orientação: Portrait (mobile-first)
- Tema: Tiffany Blue

## Uso
Os ícones são automaticamente referenciados no `index.html`:
- Favicon no navegador
- Apple Touch Icon para iOS
- PWA icons para instalação em dispositivos
# projeto-buiu

Overlay de roteiro em Electron com **exclusão de captura de tela** (teleprompter). A janela
fica sempre no topo do seu monitor, não rouba o foco e **não aparece em compartilhamentos
de tela** (Teams, Meet, Zoom, OBS), pois usa `setContentProtection`.

Renderiza o conteúdo de `roteiro.md` e permite navegar por seções via atalhos globais.

## Como rodar

```powershell
npm install
npm start
```

## Atalhos

| Atalho | Ação |
|--------|------|
| `Ctrl+Alt+\` | Mostrar / ocultar o overlay |
| `Ctrl+Alt+C` | Modo configuração: redimensiona/move a janela e salva o tamanho |
| `Ctrl+Alt+R` | Reiniciar o aplicativo (botão de pânico) |
| `Ctrl+Alt+I` | Ligar/desligar início automático com o Windows |
| `Ctrl+Alt+Q` | Sair do aplicativo |
| `Ctrl+Alt+Shift+Setas` | Mover a janela na direção da seta (mantenha pressionado para continuar) |
| `Ctrl+Alt+=` | Deixar a janela mais opaca (menos transparente) |
| `Ctrl+Alt+-` | Deixar a janela mais transparente |
| `Ctrl+0` | Mostrar o roteiro inteiro |
| `Ctrl+1` | Mostrar apenas a Parte 0+1 (Setup e commits) |
| `Ctrl+2` | Mostrar apenas a Parte 2 (Discovery) |
| `Ctrl+3` | Mostrar apenas a Parte 3 (Fases) |
| `Ctrl+4` | Mostrar apenas a Parte 4 (Azure DevOps) |
| `Ctrl+5` | Mostrar apenas os Apêndices |

Os atalhos `Ctrl+0..5` só ficam ativos enquanto o overlay está visível, para não
conflitar com outros aplicativos quando ele está oculto.

## Robustez

- Se o renderer travar ou ficar sem resposta, a janela é recarregada/recriada
  automaticamente; exceções no processo principal não derrubam o aplicativo.
- `Ctrl+Alt+R` relança o aplicativo do zero (botão de pânico) caso algo fique estranho.
- Instância única: tentar abrir de novo apenas reexibe a janela existente.
- Posição, tamanho e opacidade são salvos e restaurados entre execuções.

## Observações

- O scroll com a roda do mouse funciona ao passar o cursor sobre a janela (depende do
  recurso do Windows "rolar janelas inativas ao passar o mouse", ligado por padrão).
- A exclusão de captura protege contra software de captura, mas não contra uma câmera
  externa filmando o monitor.
- Requer Windows 10 versão 2004 ou superior.

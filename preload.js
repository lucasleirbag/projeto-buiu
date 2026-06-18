const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ponteDoOverlay", {
  aoReceberRoteiro: (callback) =>
    ipcRenderer.on("carregar-roteiro", (evento, secoesRenderizadas) => callback(secoesRenderizadas)),
  aoFiltrarParte: (callback) =>
    ipcRenderer.on("filtrar-parte", (evento, numeroDaParte) => callback(numeroDaParte)),
  aoAlternarModoConfiguracao: (callback) =>
    ipcRenderer.on("modo-configuracao", (evento, modoAtivo) => callback(modoAtivo)),
  aoAplicarTamanhoDaFonte: (callback) =>
    ipcRenderer.on("aplicar-tamanho-da-fonte", (evento, tamanhoDaFonte) => callback(tamanhoDaFonte)),
  aoReceberAviso: (callback) =>
    ipcRenderer.on("aviso", (evento, mensagemDeAviso) => callback(mensagemDeAviso)),
});

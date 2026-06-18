const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const CAMINHO_DO_ROTEIRO = path.join(__dirname, "roteiro.md");
const NUMERO_MAXIMO_DE_PARTES = 5;

const CONFIGURACAO_PADRAO = {
  largura: 480,
  altura: 720,
  posicao_horizontal: null,
  posicao_vertical: null,
  tamanho_da_fonte: 14,
};

let janelaDoOverlay = null;
let modoConfiguracaoAtivo = false;
let configuracaoAtual = { ...CONFIGURACAO_PADRAO };

function obterCaminhoDaConfiguracao() {
  return path.join(app.getPath("userData"), "config.json");
}

function carregarConfiguracao() {
  try {
    const conteudoDoArquivo = fs.readFileSync(obterCaminhoDaConfiguracao(), "utf-8");
    return { ...CONFIGURACAO_PADRAO, ...JSON.parse(conteudoDoArquivo) };
  } catch (erroAoLer) {
    return { ...CONFIGURACAO_PADRAO };
  }
}

function salvarConfiguracao(configuracaoParaSalvar) {
  fs.writeFileSync(
    obterCaminhoDaConfiguracao(),
    JSON.stringify(configuracaoParaSalvar, null, 2),
    "utf-8"
  );
}

function lerTextoDoRoteiro() {
  try {
    return fs.readFileSync(CAMINHO_DO_ROTEIRO, "utf-8");
  } catch (erroAoLer) {
    return "# Roteiro nao encontrado\n\nO arquivo roteiro.md nao foi localizado.";
  }
}

function classificarParteDaSecao(tituloDaSecao) {
  const tituloEmMaiusculas = tituloDaSecao.toUpperCase();
  if (tituloEmMaiusculas.includes("PARTE 0") || tituloEmMaiusculas.includes("PARTE 1")) {
    return 1;
  }
  if (tituloEmMaiusculas.includes("PARTE 2")) {
    return 2;
  }
  if (tituloEmMaiusculas.includes("PARTE 3")) {
    return 3;
  }
  if (tituloEmMaiusculas.includes("PARTE 4")) {
    return 4;
  }
  if (tituloEmMaiusculas.includes("APÊNDICE") || tituloEmMaiusculas.includes("APENDICE")) {
    return 5;
  }
  return 0;
}

function construirSecoesRenderizadas(textoDoRoteiro) {
  const linhasDoRoteiro = textoDoRoteiro.split("\n");
  const secoesAgrupadas = [];
  let secaoEmConstrucao = { titulo: "", linhas: [] };

  for (const linhaAtual of linhasDoRoteiro) {
    if (linhaAtual.startsWith("## ")) {
      secoesAgrupadas.push(secaoEmConstrucao);
      secaoEmConstrucao = { titulo: linhaAtual.replace(/^##\s+/, ""), linhas: [linhaAtual] };
    } else {
      secaoEmConstrucao.linhas.push(linhaAtual);
    }
  }
  secoesAgrupadas.push(secaoEmConstrucao);

  return secoesAgrupadas.map((secao) => ({
    parte: classificarParteDaSecao(secao.titulo),
    html: marked.parse(secao.linhas.join("\n")),
  }));
}

function enviarRoteiroParaJanela() {
  const secoesRenderizadas = construirSecoesRenderizadas(lerTextoDoRoteiro());
  janelaDoOverlay.webContents.send("carregar-roteiro", secoesRenderizadas);
  janelaDoOverlay.webContents.send("aplicar-tamanho-da-fonte", configuracaoAtual.tamanho_da_fonte);
}

function criarJanelaDoOverlay() {
  configuracaoAtual = carregarConfiguracao();

  const opcoesDaJanela = {
    width: configuracaoAtual.largura,
    height: configuracaoAtual.altura,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };
  if (configuracaoAtual.posicao_horizontal !== null && configuracaoAtual.posicao_vertical !== null) {
    opcoesDaJanela.x = configuracaoAtual.posicao_horizontal;
    opcoesDaJanela.y = configuracaoAtual.posicao_vertical;
  }

  janelaDoOverlay = new BrowserWindow(opcoesDaJanela);
  janelaDoOverlay.setContentProtection(true);
  janelaDoOverlay.setAlwaysOnTop(true, "screen-saver");
  janelaDoOverlay.setVisibleOnAllWorkspaces(true);
  janelaDoOverlay.loadFile(path.join(__dirname, "renderer", "index.html"));

  janelaDoOverlay.webContents.on("did-finish-load", () => {
    enviarRoteiroParaJanela();
    mostrarOverlay();
  });
}

function registrarAtalhosDeNavegacao() {
  globalShortcut.register("Control+0", () => enviarFiltroDeParte(0));
  for (let numeroDaParte = 1; numeroDaParte <= NUMERO_MAXIMO_DE_PARTES; numeroDaParte += 1) {
    globalShortcut.register(`Control+${numeroDaParte}`, () => enviarFiltroDeParte(numeroDaParte));
  }
}

function removerAtalhosDeNavegacao() {
  globalShortcut.unregister("Control+0");
  for (let numeroDaParte = 1; numeroDaParte <= NUMERO_MAXIMO_DE_PARTES; numeroDaParte += 1) {
    globalShortcut.unregister(`Control+${numeroDaParte}`);
  }
}

function registrarAtalhosFixos() {
  globalShortcut.register("Control+Alt+\\", alternarVisibilidade);
  globalShortcut.register("Control+Alt+C", alternarModoConfiguracao);
  globalShortcut.register("Control+Alt+Q", () => app.quit());
}

function enviarFiltroDeParte(numeroDaParte) {
  if (!janelaDoOverlay) {
    return;
  }
  if (!janelaDoOverlay.isVisible()) {
    mostrarOverlay();
  }
  janelaDoOverlay.webContents.send("filtrar-parte", numeroDaParte);
}

function mostrarOverlay() {
  if (!janelaDoOverlay) {
    return;
  }
  janelaDoOverlay.showInactive();
  registrarAtalhosDeNavegacao();
}

function ocultarOverlay() {
  if (!janelaDoOverlay) {
    return;
  }
  janelaDoOverlay.hide();
  removerAtalhosDeNavegacao();
}

function alternarVisibilidade() {
  if (janelaDoOverlay && janelaDoOverlay.isVisible()) {
    ocultarOverlay();
  } else {
    mostrarOverlay();
  }
}

function alternarModoConfiguracao() {
  if (!janelaDoOverlay) {
    return;
  }
  modoConfiguracaoAtivo = !modoConfiguracaoAtivo;
  janelaDoOverlay.setResizable(modoConfiguracaoAtivo);
  janelaDoOverlay.setFocusable(modoConfiguracaoAtivo);

  if (modoConfiguracaoAtivo) {
    janelaDoOverlay.setAlwaysOnTop(true, "screen-saver");
    janelaDoOverlay.focus();
  } else {
    const limitesAtuaisDaJanela = janelaDoOverlay.getBounds();
    configuracaoAtual.largura = limitesAtuaisDaJanela.width;
    configuracaoAtual.altura = limitesAtuaisDaJanela.height;
    configuracaoAtual.posicao_horizontal = limitesAtuaisDaJanela.x;
    configuracaoAtual.posicao_vertical = limitesAtuaisDaJanela.y;
    salvarConfiguracao(configuracaoAtual);
  }
  janelaDoOverlay.webContents.send("modo-configuracao", modoConfiguracaoAtivo);
}

app.whenReady().then(() => {
  criarJanelaDoOverlay();
  registrarAtalhosFixos();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  app.quit();
});

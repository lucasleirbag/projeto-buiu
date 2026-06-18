const { app, BrowserWindow, globalShortcut } = require("electron");
const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const CAMINHO_DO_ROTEIRO = path.join(__dirname, "roteiro.md");
const NUMERO_MAXIMO_DE_PARTES = 5;
const PASSO_DE_MOVIMENTO_EM_PIXELS = 25;
const PASSO_DE_OPACIDADE = 0.05;
const OPACIDADE_MINIMA = 0.2;
const OPACIDADE_MAXIMA = 1;

const CONFIGURACAO_PADRAO = {
  largura: 480,
  altura: 720,
  posicao_horizontal: null,
  posicao_vertical: null,
  tamanho_da_fonte: 14,
  opacidade: 0.85,
  iniciar_com_o_sistema: false,
};

let janelaDoOverlay = null;
let modoConfiguracaoAtivo = false;
let estaEncerrandoAplicacao = false;
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
  try {
    fs.writeFileSync(
      obterCaminhoDaConfiguracao(),
      JSON.stringify(configuracaoParaSalvar, null, 2),
      "utf-8"
    );
  } catch (erroAoSalvar) {
    console.error("Falha ao salvar configuracao:", erroAoSalvar);
  }
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
  janelaDoOverlay.setOpacity(configuracaoAtual.opacidade);
  janelaDoOverlay.on("show", () => janelaDoOverlay.setContentProtection(true));
  configurarRecuperacaoDeFalhas();
  janelaDoOverlay.loadFile(path.join(__dirname, "renderer", "index.html"));

  janelaDoOverlay.webContents.on("did-finish-load", () => {
    enviarRoteiroParaJanela();
    mostrarOverlay();
  });
}

function configurarRecuperacaoDeFalhas() {
  janelaDoOverlay.webContents.on("render-process-gone", () => recuperarDeFalhaNoRenderer());
  janelaDoOverlay.webContents.on("unresponsive", () => recuperarDeFalhaNoRenderer());
  janelaDoOverlay.on("closed", () => {
    janelaDoOverlay = null;
    if (!estaEncerrandoAplicacao) {
      criarJanelaDoOverlay();
    }
  });
}

function recuperarDeFalhaNoRenderer() {
  if (estaEncerrandoAplicacao) {
    return;
  }
  if (janelaDoOverlay && !janelaDoOverlay.isDestroyed()) {
    janelaDoOverlay.reload();
  } else {
    criarJanelaDoOverlay();
  }
}

function registrarAtalhosDeNavegacao() {
  globalShortcut.register("Control+0", () => enviarFiltroDeParte(0));
  for (let numeroDaParte = 1; numeroDaParte <= NUMERO_MAXIMO_DE_PARTES; numeroDaParte += 1) {
    globalShortcut.register(`Control+${numeroDaParte}`, () => enviarFiltroDeParte(numeroDaParte));
  }
  globalShortcut.register("Control+Alt+Shift+Left", () => moverJanela(-PASSO_DE_MOVIMENTO_EM_PIXELS, 0));
  globalShortcut.register("Control+Alt+Shift+Right", () => moverJanela(PASSO_DE_MOVIMENTO_EM_PIXELS, 0));
  globalShortcut.register("Control+Alt+Shift+Up", () => moverJanela(0, -PASSO_DE_MOVIMENTO_EM_PIXELS));
  globalShortcut.register("Control+Alt+Shift+Down", () => moverJanela(0, PASSO_DE_MOVIMENTO_EM_PIXELS));
  globalShortcut.register("Control+Alt+=", () => ajustarOpacidade(PASSO_DE_OPACIDADE));
  globalShortcut.register("Control+Alt+-", () => ajustarOpacidade(-PASSO_DE_OPACIDADE));
}

function removerAtalhosDeNavegacao() {
  globalShortcut.unregister("Control+0");
  for (let numeroDaParte = 1; numeroDaParte <= NUMERO_MAXIMO_DE_PARTES; numeroDaParte += 1) {
    globalShortcut.unregister(`Control+${numeroDaParte}`);
  }
  globalShortcut.unregister("Control+Alt+Shift+Left");
  globalShortcut.unregister("Control+Alt+Shift+Right");
  globalShortcut.unregister("Control+Alt+Shift+Up");
  globalShortcut.unregister("Control+Alt+Shift+Down");
  globalShortcut.unregister("Control+Alt+=");
  globalShortcut.unregister("Control+Alt+-");
}

function registrarAtalhosFixos() {
  globalShortcut.register("Control+Alt+\\", alternarVisibilidade);
  globalShortcut.register("Control+Alt+C", alternarModoConfiguracao);
  globalShortcut.register("Control+Alt+Q", encerrarAplicacao);
  globalShortcut.register("Control+Alt+R", reiniciarAplicacao);
  globalShortcut.register("Control+Alt+I", alternarInicioComOSistema);
}

function moverJanela(deslocamentoHorizontal, deslocamentoVertical) {
  if (!janelaDoOverlay) {
    return;
  }
  const [posicaoHorizontalAtual, posicaoVerticalAtual] = janelaDoOverlay.getPosition();
  const novaPosicaoHorizontal = posicaoHorizontalAtual + deslocamentoHorizontal;
  const novaPosicaoVertical = posicaoVerticalAtual + deslocamentoVertical;
  janelaDoOverlay.setPosition(novaPosicaoHorizontal, novaPosicaoVertical);
  configuracaoAtual.posicao_horizontal = novaPosicaoHorizontal;
  configuracaoAtual.posicao_vertical = novaPosicaoVertical;
}

function ajustarOpacidade(incrementoDeOpacidade) {
  if (!janelaDoOverlay) {
    return;
  }
  let novaOpacidade = configuracaoAtual.opacidade + incrementoDeOpacidade;
  novaOpacidade = Math.min(OPACIDADE_MAXIMA, Math.max(OPACIDADE_MINIMA, novaOpacidade));
  configuracaoAtual.opacidade = novaOpacidade;
  janelaDoOverlay.setOpacity(novaOpacidade);
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

function enviarAviso(mensagemDeAviso) {
  if (janelaDoOverlay && !janelaDoOverlay.isDestroyed()) {
    if (!janelaDoOverlay.isVisible()) {
      mostrarOverlay();
    }
    janelaDoOverlay.webContents.send("aviso", mensagemDeAviso);
  }
}

function mostrarOverlay() {
  if (!janelaDoOverlay) {
    return;
  }
  janelaDoOverlay.showInactive();
  janelaDoOverlay.setContentProtection(true);
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
  janelaDoOverlay.setContentProtection(true);
  janelaDoOverlay.webContents.send("modo-configuracao", modoConfiguracaoAtivo);
}

function aplicarInicioAutomatico() {
  app.setLoginItemSettings({
    openAtLogin: configuracaoAtual.iniciar_com_o_sistema,
    path: process.execPath,
    args: [app.getAppPath()],
  });
}

function alternarInicioComOSistema() {
  configuracaoAtual.iniciar_com_o_sistema = !configuracaoAtual.iniciar_com_o_sistema;
  aplicarInicioAutomatico();
  salvarConfiguracao(configuracaoAtual);
  enviarAviso(
    configuracaoAtual.iniciar_com_o_sistema
      ? "Inicio automatico com o Windows: LIGADO"
      : "Inicio automatico com o Windows: DESLIGADO"
  );
}

function encerrarAplicacao() {
  estaEncerrandoAplicacao = true;
  salvarConfiguracao(configuracaoAtual);
  app.quit();
}

function reiniciarAplicacao() {
  estaEncerrandoAplicacao = true;
  salvarConfiguracao(configuracaoAtual);
  app.relaunch();
  app.exit(0);
}

process.on("uncaughtException", (erroNaoTratado) => {
  console.error("Excecao nao tratada no processo principal:", erroNaoTratado);
});

process.on("unhandledRejection", (motivoDaRejeicao) => {
  console.error("Rejeicao de promessa nao tratada:", motivoDaRejeicao);
});

const obteveBloqueioDeInstanciaUnica = app.requestSingleInstanceLock();
if (!obteveBloqueioDeInstanciaUnica) {
  app.quit();
} else {
  app.on("second-instance", () => mostrarOverlay());

  app.on("child-process-gone", (evento, detalhesDoProcesso) => {
    console.error("Processo filho encerrado:", detalhesDoProcesso.type, detalhesDoProcesso.reason);
  });

  app.whenReady().then(() => {
    configuracaoAtual = carregarConfiguracao();
    aplicarInicioAutomatico();
    criarJanelaDoOverlay();
    registrarAtalhosFixos();
  });

  app.on("will-quit", () => {
    salvarConfiguracao(configuracaoAtual);
    globalShortcut.unregisterAll();
  });

  app.on("window-all-closed", () => {
    if (estaEncerrandoAplicacao) {
      app.quit();
    }
  });
}

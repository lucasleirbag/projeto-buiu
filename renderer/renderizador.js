const containerDoRoteiro = document.getElementById("roteiro");
const bannerDeConfiguracao = document.getElementById("banner-configuracao");
const elementoDeAviso = document.getElementById("aviso");

const DURACAO_DO_AVISO_EM_MILISSEGUNDOS = 2500;

let parteSelecionada = 0;
let temporizadorDoAviso = null;

function aplicarFiltroDeParte(numeroDaParte) {
  const todasAsSecoes = document.querySelectorAll(".secao");
  for (const secao of todasAsSecoes) {
    const parteDaSecao = Number(secao.dataset.parte);
    const deveExibirSecao =
      numeroDaParte === 0 || parteDaSecao === 0 || parteDaSecao === numeroDaParte;
    secao.style.display = deveExibirSecao ? "block" : "none";
  }
}

window.ponteDoOverlay.aoReceberRoteiro((secoesRenderizadas) => {
  containerDoRoteiro.innerHTML = "";
  for (const secao of secoesRenderizadas) {
    const elementoDaSecao = document.createElement("section");
    elementoDaSecao.className = "secao";
    elementoDaSecao.dataset.parte = secao.parte;
    elementoDaSecao.innerHTML = secao.html;
    containerDoRoteiro.appendChild(elementoDaSecao);
  }
  aplicarFiltroDeParte(parteSelecionada);
});

window.ponteDoOverlay.aoFiltrarParte((numeroDaParte) => {
  parteSelecionada = numeroDaParte;
  aplicarFiltroDeParte(numeroDaParte);
  window.scrollTo(0, 0);
});

window.ponteDoOverlay.aoAlternarModoConfiguracao((modoAtivo) => {
  bannerDeConfiguracao.style.display = modoAtivo ? "block" : "none";
});

window.ponteDoOverlay.aoAplicarTamanhoDaFonte((tamanhoDaFonte) => {
  document.body.style.fontSize = `${tamanhoDaFonte}px`;
});

window.ponteDoOverlay.aoReceberAviso((mensagemDeAviso) => {
  elementoDeAviso.textContent = mensagemDeAviso;
  elementoDeAviso.style.display = "block";
  if (temporizadorDoAviso) {
    clearTimeout(temporizadorDoAviso);
  }
  temporizadorDoAviso = setTimeout(() => {
    elementoDeAviso.style.display = "none";
  }, DURACAO_DO_AVISO_EM_MILISSEGUNDOS);
});

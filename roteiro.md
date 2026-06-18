# Roteiro de Entrevista — Reconhecimento Facial (passo a passo ao vivo)

Faça **de cima para baixo**. Três tipos de bloco:

- 🟦 **PowerShell** → comando no terminal.
- 🟨 **Prompt IA** → texto para colar no Claude Code (já enxuto e direto).
- 🟩 **Validação** → o que rodar e o que observar.

> Estratégia: os **primeiros commits são seus, no PowerShell** (domínio de git/ambiente).
> Do discovery em diante, **cada fase é commitada pela IA** e você só testa e aprova.
> No fim, sobe para o Azure DevOps.

---

## PARTE 0 — Checagem rápida (antes de compartilhar a tela)

🟦 PowerShell:
```powershell
pyenv --version; git --version; python --version
```

---

## PARTE 1 — Criação do projeto e PRIMEIROS COMMITS (manuais)

### 1.1 Criar a pasta e entrar
🟦 PowerShell:
```powershell
cd $HOME
mkdir Entrevista-Cebraspe
cd Entrevista-Cebraspe
```

### 1.2 Fixar o Python com pyenv
🟦 PowerShell:
```powershell
pyenv install 3.11.9
pyenv local 3.11.9
python --version
```
> `pyenv local` cria o `.python-version` e trava esta pasta no 3.11.9.

### 1.3 Criar e ativar o venv
🟦 PowerShell:
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
> O prompt passa a mostrar `(venv)`. Se der erro de permissão:
> `Set-ExecutionPolicy -Scope Process -Bypass`

### 1.4 Iniciar git + .gitignore
🟦 PowerShell:
```powershell
git init
```
```powershell
@"
venv/
__pycache__/
*.py[cod]
data/*.db
data/*.db-journal
"@ | Out-File -Encoding utf8 .gitignore
```

### 1.5 PRIMEIRO COMMIT (manual)
🟦 PowerShell:
```powershell
git add .gitignore .python-version
git commit -m "chore: configuracao inicial (versao do python e gitignore)"
```

---

## PARTE 2 — DISCOVERY + REFINAMENTO (no Claude Code)

### 2.1 Abrir o Claude Code
🟦 PowerShell (com `(venv)` ativo):
```powershell
claude
```

### 2.2 Definir as políticas (gera o CLAUDE.md)
🟨 Prompt IA:
```
/init Padrão do projeto: clean code, SEM comentários, nomes em português descritivos
(que revelem o estado e o fluxo do dado), nada de variáveis de uma letra. Estrutura e
pastas em inglês — o código-fonte fica em src/.
```

### 2.3 Pedir discovery (sem código)
🟨 Prompt IA:
```
Requisitos da aplicação:
- Reconhecimento de rosto + identificação do usuário
- Entrada por webcam
- Detecção em tempo real com rede neural (SEM OpenCV)
- Extração biométrica do rosto SEM técnicas de pontos
- Cadastrar o mapeamento do rosto em banco
- Reconhecer o rosto cadastrado contra a câmera
- Acesso ao banco SOMENTE via Stored Procedures (sem ORM)
- String de conexão em arquivo de configuração

Faça APENAS o discovery e o refinamento das etapas (sem código). Vamos desenvolver
faseado: a cada fase, commit + teste de validação.
```

### 2.4 Responder às decisões (respostas curtas)
- **Banco:** `SQLite, arquivo em data/.`
- **Interface:** `Tkinter.`
- **Stack de IA:** `PyTorch / facenet-pytorch.`
- **Conflito das procedures:** `Manter SQLite e EMULAR as procedures (SQL em arquivos .sql chamados por nome, sem ORM). Documente a ressalva.`

> 💬 **Fala de domínio:** "SQLite não tem stored procedures nativas. Mantive por escopo,
> mas isolei todo o SQL em arquivos chamados por nome para preservar a intenção do
> requisito e documentei a ressalva — se fosse eliminatório, migraria para SQL Server
> LocalDB sem mudar o resto da arquitetura."

A IA grava `docs/discovery.md` com o plano em 6 fases.

---

## PARTE 3 — DESENVOLVIMENTO FASEADO (IA implementa e commita)

Padrão de cada fase: você dá o **prompt curto** → a IA implementa e valida o possível
headless → **você roda a validação visual** e aprova → a IA commita.

| Fase | 🟨 Prompt IA | 🟩 Validar (rodar `python -m src.aplicacao`) e olhar | Aprovar com |
|---|---|---|---|
| 0 Fundação | `Siga para a Fase 0.` | Sobe, lê config, conecta no banco | `Conexão ok. Commite e siga.` |
| 1 Webcam | `Siga para a Fase 1.` (depois: `Use a FaceTime redirecionada, índice 1.`) | Janela com vídeo ao vivo | `Fluido e cores ok. Commite e siga.` |
| 2 Detecção | `Siga para a Fase 2.` | Retângulo verde no rosto | `Detecção ok. Commite e siga.` |
| 3 Biometria | `Siga para a Fase 3.` | Distância baixa p/ você, alta p/ outro | `Distâncias coerentes. Commite e siga.` |
| 4 Persistência | `Siga para a Fase 4.` | "Cadastrado com sucesso" | `Gravou no banco. Commite e siga. No cadastro, capture 5 amostras.` |
| 5 Reconhecimento | `Siga para a Fase 5.` | Identifica você; rejeita desconhecido | `Reconhecimento ok. Commite e siga. Agora: nome na caixa em tempo real (sem botão), simplificar a tela e permitir excluir usuários.` |
| 6 Tempo real + exclusão | *(incluído na aprovação da Fase 5)* | Nome na caixa automático; exclusão funciona | `Tudo ok. Commite.` |

> ⚠️ Se aparecer `not enough free memory for image buffer` (Tk com frame grande):
> `Reduza a resolução de exibição antes de gerar a imagem do Tkinter.`

---

## PARTE 4 — Subir para o Azure DevOps

### 4.1 Criar o repositório (navegador)
1. `https://dev.azure.com/` → sua organização → um **Project**.
2. **Repos** → novo repositório (ex.: `Entrevista-Cebraspe`), **sem** README.
3. Copie a URL: `https://dev.azure.com/SUA-ORG/SEU-PROJETO/_git/Entrevista-Cebraspe`

### 4.2 Conectar e enviar
🟦 PowerShell:
```powershell
git remote add origin https://dev.azure.com/SUA-ORG/SEU-PROJETO/_git/Entrevista-Cebraspe
git branch -M main
git push -u origin main
```
> Autenticação na 1ª vez: janela do navegador (Credential Manager) **ou** um **PAT**
> (Azure DevOps → *User settings* → *Personal access tokens* → escopo **Code Read & Write**;
> cole o PAT no lugar da senha).

### 4.3 Conferir
🟦 PowerShell:
```powershell
git log --oneline; git remote -v
```

---

## APÊNDICE A — Como DEMONSTRAR conhecimento técnico

### A.1 Comandos que mostram domínio (rode e comente)

🟦 Estrutura limpa do projeto (sem o venv):
```powershell
Get-ChildItem -Recurse -Directory -Exclude venv | Select-Object FullName
```

🟦 Histórico de commits em árvore (mostra entrega faseada):
```powershell
git log --oneline --graph --decorate
```

🟦 Mostrar o conteúdo de um commit específico (transparência do que mudou):
```powershell
git show --stat HEAD
```

🟦 Provar reprodutibilidade do ambiente:
```powershell
pip freeze > requirements.txt
git add requirements.txt; git commit -m "chore: congela dependencias"
```

🟦 Mostrar que o SQL está isolado em "procedures" (atende o requisito sem ORM):
```powershell
Get-ChildItem src\procedures
```

🟦 Marcar a entrega final com uma tag (boa prática de versionamento):
```powershell
git tag -a v1.0 -m "Entrega do teste pratico"
git push origin v1.0
```

### A.2 Pontos técnicos para verbalizar (1 frase cada)

- **Ambiente:** "pyenv fixa a versão do Python; venv isola dependências; o venv fica no
  .gitignore porque é específico da máquina — reprodutibilidade vem do requirements.txt."
- **Sem OpenCV:** "Detecção com MTCNN (rede neural em cascata); captura com pygrabber via
  DirectShow. Nenhuma dependência de OpenCV."
- **Sem pontos:** "Biometria é um embedding de 512 dimensões do FaceNet (aprendizado
  métrico), não landmarks. Reconhecimento = distância euclidiana com limiar."
- **Robustez:** "Guardo 5 amostras por usuário e comparo pela menor distância — tolera
  variação de pose e luz melhor que uma única captura."
- **Limiar:** "O corte é configurável; é o trade-off entre falsos positivos e falsos
  negativos (FAR × FRR)."
- **Banco:** "SQL isolado em arquivos chamados por nome, parâmetros sempre vinculados
  (previne SQL injection), sem ORM. String de conexão fora do código, no .ini."
- **Modelagem:** "Esquema 1‑para‑N (usuário → biometrias); exclusão remove as biometrias
  em cascata. Embedding serializado como BLOB float32 com roundtrip validado."
- **Arquitetura:** "Camadas separadas — captura, detecção, extração, persistência,
  reconhecimento e UI — com injeção de dependências na janela. Cada módulo tem uma
  responsabilidade única."
- **Tempo real:** "O reconhecimento roda a cada N quadros (throttling) para não travar a
  UI; a exibição é redimensionada para controlar memória do Tk."
- **Processo:** "Discovery antes de codar, riscos levantados (ex.: SQLite × procedures),
  entrega faseada com validação e commit a cada etapa."

### A.3 Perguntas que podem te fazer (e respostas curtas)

- *"Por que não OpenCV?"* → Era proibido; usei MTCNN (NN) + pygrabber.
- *"Por que embedding e não pontos?"* → Requisito proibia pontos; embedding generaliza
  melhor e dá comparação por distância.
- *"E se o banco mudar?"* → Só troco o driver e a sintaxe das procedures; a camada de
  acesso já chama tudo por nome.
- *"Como escalaria o reconhecimento p/ muitos usuários?"* → Índice vetorial (ex.: FAISS)
  em vez de varrer todos; aqui mantive simples pelo escopo.
- *"Como melhoraria a precisão?"* → Mais amostras, alinhamento, normalização de
  iluminação e calibração do limiar com dados reais.

## APÊNDICE B — Comandos do dia a dia
```powershell
.\venv\Scripts\Activate.ps1     # ativar venv
python -m src.aplicacao         # rodar a aplicação
git status                      # ver mudanças
git log --oneline               # ver commits
```

## APÊNDICE C — Ordem esperada dos commits
1. `chore: configuracao inicial ...` — **manual (você)**
2–8. `Fase 0` … `Fase 6` — **IA** (uma por fase)
9. *(opcional)* `chore: congela dependencias` + tag `v1.0`

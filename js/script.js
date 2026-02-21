/* ==========================================================
   Tarefas Diárias - script.js (VERSÃO ULTRA DIDÁTICA)
   ----------------------------------------------------------
   O que este arquivo faz:
   1) Espera o HTML carregar (DOMContentLoaded)
   2) Pega elementos do DOM (inputs, botões, lista, áudio)
   3) Carrega tarefas do localStorage
   4) Renderiza tarefas na tela
   5) Cria tarefas via formulário
   6) Inicia/Pausa/Reseta timer por tarefa
   7) Filtra tarefas (todas / abertas / concluídas)
   8) Toca som quando o timer chega em 00:00
   ========================================================== */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Tarefas Diárias carregou ✅");

  /* ================= ELEMENTOS DO DOM ================= */
  const formTarefa = document.getElementById("formTarefa");
  const inputDescricao = document.getElementById("descricao");
  const inputData = document.getElementById("data");
  const inputMinutos = document.getElementById("minutos");

  const listaTarefas = document.getElementById("lista");
  const botoesFiltro = document.querySelectorAll(".filtro");
  const botaoLimparTudo = document.getElementById("limparTudo");

  const audioFinalizacao = document.getElementById("somFinalizacao");

  // Validações rápidas (erros claros no console)
  if (!formTarefa) console.error("❌ Não achei #formTarefa no HTML.");
  if (!inputDescricao) console.error("❌ Não achei #descricao no HTML.");
  if (!inputData) console.error("❌ Não achei #data no HTML.");
  if (!inputMinutos) console.error("❌ Não achei #minutos no HTML.");
  if (!listaTarefas) console.error("❌ Não achei #lista no HTML.");
  if (!botaoLimparTudo) console.error("❌ Não achei #limparTudo no HTML.");

  /* ================= ESTADO DO APP ================= */
  const STORAGE_KEY = "tarefas_diarias_v1";

  let tarefas = carregarTarefasDoStorage();
  let temporizadoresAtivos = {};
  let filtroAtual = "todas";

  /* ================= ÁUDIO (desbloquear + tocar) ================= */
  function destravarAudioNoPrimeiroClique() {
    if (!audioFinalizacao) return;

    audioFinalizacao.load();

    const volumeOriginal = audioFinalizacao.volume;
    audioFinalizacao.volume = 0;
    audioFinalizacao.currentTime = 0;

    const promessaPlay = audioFinalizacao.play();

    if (promessaPlay && typeof promessaPlay.then === "function") {
      promessaPlay
        .then(function () {
          audioFinalizacao.pause();
          audioFinalizacao.currentTime = 0;
        })
        .catch(function () {
          // Se bloquear, não quebra o app.
        })
        .finally(function () {
          audioFinalizacao.volume = (volumeOriginal ?? 1);
        });
    } else {
      audioFinalizacao.volume = (volumeOriginal ?? 1);
    }
  }

  document.addEventListener("pointerdown", destravarAudioNoPrimeiroClique, { once: true });

  function tocarSomDeFinalizacao() {
    if (!audioFinalizacao) return;

    audioFinalizacao.load();
    audioFinalizacao.muted = false;
    audioFinalizacao.volume = 1;
    audioFinalizacao.currentTime = 0;

    audioFinalizacao.play().catch(function (erro) {
      console.warn("Áudio não tocou (bloqueio/arquivo/erro):", erro);
    });
  }

  // Debug manual no console: testSom()
  window.testSom = function () {
    console.log("🔊 Testando som... clique no popup antes para liberar o áudio.");
    tocarSomDeFinalizacao();
  };

  /* ================= STORAGE ================= */
  function carregarTarefasDoStorage() {
    const textoSalvo = localStorage.getItem(STORAGE_KEY);
    if (!textoSalvo) return [];

    try {
      const dados = JSON.parse(textoSalvo);
      if (Array.isArray(dados)) return dados;
      return [];
    } catch (e) {
      console.warn("Storage corrompido. Limpando...", e);
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  function salvarTarefasNoStorage() {
    const texto = JSON.stringify(tarefas);
    localStorage.setItem(STORAGE_KEY, texto);
  }

  /* ================= UTILITÁRIOS ================= */
  function formatarSegundosParaMMSS(segundos) {
    const minutos = Math.floor(segundos / 60);
    const restoSegundos = segundos % 60;

    const mm = String(minutos).padStart(2, "0");
    const ss = String(restoSegundos).padStart(2, "0");

    return mm + ":" + ss;
  }

  function formatarDataISOParaBR(dataISO) {
    if (!dataISO) return "";
    const partes = dataISO.split("-");
    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];
    return dia + "/" + mes + "/" + ano;
  }

  function colocarDataDeHojeNoInput() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    inputData.value = ano + "-" + mes + "-" + dia;
  }

  /* ================= RENDER ================= */
  function obterTarefasVisiveisPeloFiltro() {
    if (filtroAtual === "abertas") {
      return tarefas.filter(function (tarefa) {
        return tarefa.concluida === false;
      });
    }

    if (filtroAtual === "concluidas") {
      return tarefas.filter(function (tarefa) {
        return tarefa.concluida === true;
      });
    }

    return tarefas;
  }

  function renderizarTela() {
    listaTarefas.innerHTML = "";

    const tarefasVisiveis = obterTarefasVisiveisPeloFiltro();

    for (let i = 0; i < tarefasVisiveis.length; i++) {
      const tarefa = tarefasVisiveis[i];
      const li = criarLiParaUmaTarefa(tarefa);
      listaTarefas.appendChild(li);
    }
  }

  function criarBotao(texto, funcaoAoClicar) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = texto;
    botao.addEventListener("click", funcaoAoClicar);
    return botao;
  }

  function criarLiParaUmaTarefa(tarefa) {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "info";

    const nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = tarefa.descricao;

    if (tarefa.concluida === true) {
      nome.classList.add("concluida");
    }

    const data = document.createElement("div");
    data.className = "data";
    data.textContent = formatarDataISOParaBR(tarefa.data);

    info.appendChild(nome);
    info.appendChild(data);

    const tempo = document.createElement("div");
    tempo.className = "tempo";
    tempo.textContent = formatarSegundosParaMMSS(tarefa.tempoRestante);

    if (tarefa.tempoRestante === 0) {
      tempo.classList.add("finalizado");
    }

    const botoes = document.createElement("div");
    botoes.className = "botoes";

    botoes.appendChild(criarBotao("▶", function () { iniciarTimerDaTarefa(tarefa.id); }));
    botoes.appendChild(criarBotao("⏸", function () { pausarTimerDaTarefa(tarefa.id); }));
    botoes.appendChild(criarBotao("🔄", function () { resetarTimerDaTarefa(tarefa.id); }));
    botoes.appendChild(criarBotao("✔", function () { alternarConclusaoDaTarefa(tarefa.id); }));
    botoes.appendChild(criarBotao("✖", function () { excluirTarefa(tarefa.id); }));

    li.appendChild(info);
    li.appendChild(tempo);
    li.appendChild(botoes);

    return li;
  }

  /* ================= FORM: criar tarefa ================= */
  function limparCamposDoFormulario() {
    inputDescricao.value = "";
    inputMinutos.value = "";
    inputDescricao.focus();
  }

  function adicionarTarefaPeloFormulario() {
    const descricao = inputDescricao.value.trim();
    const data = inputData.value;
    const minutos = parseInt(inputMinutos.value, 10);

    if (!descricao || !data || !minutos || minutos < 1) {
      alert("Preencha todos os campos corretamente.");
      return;
    }

    const novaTarefa = {
      id: Date.now(),
      descricao: descricao,
      data: data,
      minutosOriginais: minutos,
      tempoRestante: minutos * 60,
      concluida: false
    };

    tarefas.push(novaTarefa);

    salvarTarefasNoStorage();
    limparCamposDoFormulario();
    renderizarTela();
  }

  /* ================= AÇÕES: concluir / excluir / limpar tudo ================= */
  function encontrarTarefaPorId(idDaTarefa) {
    for (let i = 0; i < tarefas.length; i++) {
      if (tarefas[i].id === idDaTarefa) {
        return tarefas[i];
      }
    }
    return null;
  }

  function alternarConclusaoDaTarefa(idDaTarefa) {
    const tarefa = encontrarTarefaPorId(idDaTarefa);
    if (!tarefa) return;

    tarefa.concluida = !tarefa.concluida;

    salvarTarefasNoStorage();
    renderizarTela();
  }

  function excluirTarefa(idDaTarefa) {
    pausarTimerDaTarefa(idDaTarefa);

    tarefas = tarefas.filter(function (tarefa) {
      return tarefa.id !== idDaTarefa;
    });

    salvarTarefasNoStorage();
    renderizarTela();
  }

  function limparTodasAsTarefas() {
    const confirmar = confirm("Tem certeza que deseja apagar TODAS as tarefas?");
    if (!confirmar) return;

    for (const idEmTexto in temporizadoresAtivos) {
      const idNumerico = Number(idEmTexto);
      pausarTimerDaTarefa(idNumerico);
    }

    tarefas = [];
    localStorage.removeItem(STORAGE_KEY);
    renderizarTela();
  }

  /* ================= TIMER ================= */
  function iniciarTimerDaTarefa(idDaTarefa) {
    if (temporizadoresAtivos[idDaTarefa]) return;

    temporizadoresAtivos[idDaTarefa] = setInterval(function () {
      const tarefa = encontrarTarefaPorId(idDaTarefa);

      if (!tarefa) {
        pausarTimerDaTarefa(idDaTarefa);
        return;
      }

      tarefa.tempoRestante = tarefa.tempoRestante - 1;

      if (tarefa.tempoRestante <= 0) {
        tarefa.tempoRestante = 0;
        tocarSomDeFinalizacao();
        pausarTimerDaTarefa(idDaTarefa);
      }

      salvarTarefasNoStorage();
      renderizarTela();
    }, 1000);
  }

  function pausarTimerDaTarefa(idDaTarefa) {
    if (!temporizadoresAtivos[idDaTarefa]) return;

    clearInterval(temporizadoresAtivos[idDaTarefa]);
    delete temporizadoresAtivos[idDaTarefa];
  }

  function resetarTimerDaTarefa(idDaTarefa) {
    const tarefa = encontrarTarefaPorId(idDaTarefa);
    if (!tarefa) return;

    tarefa.tempoRestante = tarefa.minutosOriginais * 60;

    salvarTarefasNoStorage();
    renderizarTela();
  }

  /* ================= EVENTOS ================= */
  formTarefa.addEventListener("submit", function (evento) {
    evento.preventDefault();
    adicionarTarefaPeloFormulario();
  });

  botaoLimparTudo.addEventListener("click", function () {
    limparTodasAsTarefas();
  });

  for (let i = 0; i < botoesFiltro.length; i++) {
    botoesFiltro[i].addEventListener("click", function () {
      for (let j = 0; j < botoesFiltro.length; j++) {
        botoesFiltro[j].classList.remove("ativo");
      }

      this.classList.add("ativo");
      filtroAtual = this.dataset.filtro;

      renderizarTela();
    });
  }

  /* ================= START ================= */
  colocarDataDeHojeNoInput();
  renderizarTela();
});

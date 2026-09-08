# Radar de Compliance

**Número da Lista**: 4<br>
**Conteúdo da Disciplina**: Grafos (Componentes Fortemente Conectados, Ordenação Topológica)<br>

## Alunos
| Matrícula | Aluno |
| -- | -- |
| 232014100  |  Marcos Vinícius Gündel da Silva | 
| 232014146  |  Pedro Teixeira Moriel Sanchez |

## Sobre
Este projeto simula um sistema de prevenção à lavagem de dinheiro (AML) para investigar redes de transações bancárias. Contas viram nós e transferências viram arestas de um grafo direcionado; a partir daí, o sistema:

1. **Localiza esquemas de lavagem em camadas (layering)**: grupos de contas que repassam fundos entre si em circuito fechado formam Componentes Fortemente Conexas (SCCs) no grafo, encontradas com o **algoritmo de Kosaraju**.
2. **Prova a existência de ciclos por meio da ordenação cronológica**: uma ordenação topológica (**algoritmo de Kahn**, por contagem de grau de entrada) tenta ordenar todas as transações no tempo. Sobre o livro-razão bruto, a ordenação falha exatamente nas contas presas em um ciclo — a falha, sozinha, já prova que existe um padrão cíclico, mesmo antes de rodar o Kosaraju.
3. **Reconstrói a linha do tempo legítima**: removendo as contas sinalizadas, a ordenação topológica é reaplicada sobre o restante do grafo (agora um DAG) e produz uma linha do tempo cronológica válida das transações restantes.
4. **Classifica os grupos suspeitos por risco**: cada grupo sinalizado recebe uma pontuação 0–100 combinando tamanho, volume interno movimentado, densidade das ligações e velocidade das transferências (tempo médio entre repasses), normalizada entre os grupos encontrados na mesma rede.

O projeto tem duas partes:
- **`src/`** — pipeline em Python (linha de comando), com os algoritmos implementados do zero.
- **`dashboard/`** — visualização interativa em HTML/CSS/JavaScript puro, que reimplementa os mesmos algoritmos no navegador para uma demonstração guiada em três fases (rede bruta → detecção → validação), sem precisar de servidor.

Por padrão, ambas as partes trabalham sobre uma **rede sintética gerada aleatoriamente**: contas legítimas organizadas em camadas (formando naturalmente um DAG) mais alguns grupos de contas de fachada inseridos propositalmente em ciclo, com uma única transação de entrada e uma de saída conectando cada grupo ao resto da rede — simulando como o dinheiro "entra sujo" e "sai limpo" de um esquema de layering.

## Screenshots
### Fase 1 - Rede Bruta
![Fase 1 - Rede Bruta](screenshots/Captura%20de%20tela%202026-09-07%20155100.png)

### Fase 2 - Isolamento de Esquemas
![Fase 2 - Isolamento de Esquemas](screenshots/Captura%20de%20tela%202026-09-07%20155130.png)

### Fase 3 - Validação Histórica
![Fase 3 - Validação Histórica](screenshots/Captura%20de%20tela%202026-09-07%20155158.png)

## Instalação
**Linguagem**: Python 3 (pipeline) + HTML/CSS/JavaScript puro (dashboard)<br>
**Framework**: Não se aplica — apenas biblioteca padrão do Python e JavaScript vanilla, sem dependências externas.<br>

### Pré-requisitos
- Ter o Python 3 instalado (nenhum pacote externo é necessário).
- Um navegador moderno, para abrir o dashboard.
- Estar na raiz do projeto ao executar o pipeline em Python.

### Comando para executar

**Pipeline (linha de comando):**
```bash
python3 src/main.py
```
Sem argumentos, o programa gera uma rede sintética aleatória. Para analisar uma rede real, passe um CSV com as colunas `from,to,amount,timestamp` (timestamp em formato ISO 8601):
```bash
python3 src/main.py caminho/para/transacoes.csv
```

Resultado gerado em:
- `data/flagged_accounts.csv` — contas sinalizadas, com o grupo, a pontuação de risco e o tamanho do grupo.
- `data/clean_timeline.csv` — ordem cronológica validada das contas restantes.

**Dashboard (visualização interativa):**
Abra `dashboard/index.html` diretamente no navegador. Não é necessário servidor nem instalação.

## Uso
Ao executar `src/main.py`, o programa:

1. Carrega o grafo (rede sintética ou CSV informado).
2. Tenta ordenar cronologicamente todas as transações do livro-razão bruto. Se a ordenação falhar, isso já indica a presença de contas em ciclo.
3. Executa o algoritmo de Kosaraju para localizar exatamente quais contas formam cada grupo suspeito.
4. Calcula uma pontuação de risco para cada grupo encontrado.
5. Remove as contas sinalizadas e repete a ordenação cronológica sobre o restante — que agora deve ter sucesso — gerando a linha do tempo limpa.
6. Grava os dois arquivos de resultado em `data/`.

No dashboard, o mesmo fluxo é apresentado como uma investigação guiada em três fases (navegáveis pelos passos no topo da tela):
- **Fase 1 — Rede Bruta**: visão geral de todas as contas e transferências.
- **Fase 2 — Isolamento de Esquemas**: os grupos suspeitos aparecem destacados; clique em qualquer grupo na lista para ver os detalhes e realçá-lo no grafo.
- **Fase 3 — Validação Histórica**: com os grupos suspeitos removidos, a linha do tempo cronológica das contas legítimas é exibida.

Use o botão **"Gerar Novo Lote de Transações"** para reiniciar a investigação com uma rede sintética diferente a qualquer momento.

## Vídeo da Apresentação

<video src="assets/g4_grafos_pa_2026_2_revisado.mp4" controls width="100%"></video>

## Outros

- Projeto em desenvolvimento.
- Por padrão o projeto roda sobre dados sintéticos gerados em tempo real; ele também aceita uma rede de transações real via CSV, desde que no formato `from,to,amount,timestamp`.
- O dashboard reimplementa os algoritmos em JavaScript para funcionar inteiramente no navegador, sem depender do backend em Python — as duas implementações seguem a mesma lógica, mas evoluem de forma independente.
- Possíveis melhorias futuras: unificar as duas implementações (ex.: o dashboard consumir diretamente os CSVs gerados pelo pipeline em Python, ou expor o pipeline via uma API simples); adicionar testes automatizados verificando que os grupos injetados pelo gerador sintético são sempre encontrados; permitir upload de um CSV real diretamente pelo dashboard.
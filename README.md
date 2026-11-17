# Investimento em Moedas

PWA estático (HTML/CSS/JS, módulos ES) para analisar tendências de pares de moedas e medir a **vantagem líquida de comprar ou vender considerando spread, tarifas e IOF**.

## O que esta versão faz
- **Início:** pares favoritos com cotação, variações e minigráfico.
- **Conversor:** valor de referência × valor líquido estimado por perfil de custos.
- **Análise:** candles (pares com BRL via PTAX) ou linha, SMA/EMA/Bollinger, sinais de SMA, MACD, RSI e Bollinger, e leitura por horizonte (2, 7, 15 e 30 dias) que confronta o movimento típico com os custos.
- **Custos:** perfis configuráveis (espécie, remessa, cartão, personalizado), ponto de equilíbrio de ida e volta, cenários de saída e comparação entre perfis.
- **Padrões gráficos:** topo/fundo duplo, ombro-cabeça-ombro (e invertido), doji, martelo, estrela cadente e engolfos, com estados, critérios, qualidade e identificação sem olhar o futuro. As figuras ficam numa camada própria: arraste, ajuste transparência e espessura, oculte uma a uma ou todas, e restaure as posições.
- **Carteira:** operações reais e simuladas (separadas), preço médio com taxas, lucro realizado e não realizado, e **projeção de venda** (empate, resultado num preço alvo, preço para o lucro desejado e quantidade a vender).
- **Figuras:** página com 24 figuras do Forex (esquema, contexto e direção); “Ver no gráfico” as mostra sobre o gráfico. **Colar dados** preenche carteira e análise a partir de texto copiado. O gráfico abre sempre limpo.
- **Backup JSON** (exportar/importar com validação), **alertas de preço de venda** (conferidos a cada 5 min com o app aberto) e detecção automática de **triângulos** e **canais**.
- Tema escuro/claro/sistema, dados em IndexedDB, cache e aviso de dado desatualizado, instalável como PWA.

## Fontes
- Banco Central (PTAX, API Olinda): AUD, CAD, CHF, EUR, GBP, JPY, USD contra BRL. Os candles diários vêm dos boletins do dia.
- Frankfurter (BCE): demais pares, só fechamento diário (MXN, CNY e cruzamentos). ARS não está disponível.
- Wise: **não integrada** (exige token privado). `sources.js` tem o ponto de extensão; ligue-a por um serviço intermediário (ex.: Cloudflare Worker) sem expor a chave.

## Ainda não implementado
Bandeiras, cunhas, topo/fundo triplo, redimensionar figuras, desenhos manuais, radar, alertas, parcelas, venda com troca para outra moeda, Wise, backtesting, relatórios CSV/Excel/PDF e backup. Taxas e IOF padrão são **exemplos**.

## Executar e testar
```
npm test                      # testes dos cálculos (Node 18+)
python3 -m http.server 8000   # abra http://localhost:8000
```
O app precisa de HTTP(S) (módulos ES e service worker), então não abra o index.html com duplo clique.

## Publicar no GitHub Pages
1. Em github.com, crie um repositório (ex.: `investimento-em-moedas`).
2. Envie todos os arquivos desta pasta (o `index.html` na raiz).
3. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.
4. Acesse `https://SEU-USUARIO.github.io/investimento-em-moedas/`.
Os caminhos são relativos, então funcionam em subdiretório. Ao alterar arquivos, aumente `V` em `service-worker.js` para renovar o cache.

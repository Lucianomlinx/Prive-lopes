# Privê Lopes Temporada

Site estático em HTML, CSS e JavaScript puro. Não precisa instalar dependências nem executar um comando de build.

## Publicar no Cloudflare Pages

1. Crie um repositório GitHub usando o conteúdo desta pasta como raiz.
2. No Cloudflare Pages, conecte o repositório.
3. Configure:
   - Framework preset: **None**
   - Production branch: `main`
   - Build command: `exit 0` (não há etapa de compilação)
   - Build output directory: `.`
   - Root directory: mantenha o padrão (raiz do repositório); use `Prive-Lopes` somente se o projeto estiver dentro de uma subpasta
4. Após o primeiro deploy, configure o domínio personalizado. Então atualize as URLs canônicas e de imagem social no `index.html`, se for usar esses metadados.

Os dois vídeos usados pelo site são cópias otimizadas em H.264/AAC e estão abaixo do limite de 25 MiB por arquivo do Pages. Os arquivos-fonte grandes, se mantidos com os nomes originais, são ignorados pelo Git conforme o `.gitignore`.

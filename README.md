# WhatsApp Bot com Integração Google Cloud

Este projeto é um bot para WhatsApp que utiliza a biblioteca `@wppconnect-team/wppconnect` para se conectar ao WhatsApp Web e processar mensagens. Ele também integra serviços do Google Cloud, como o **Google Speech-to-Text** e o **Google Vision**, para transcrever áudios e extrair textos de imagens, respectivamente. Além disso, o bot envia os resultados processados para webhooks configurados.

## Funcionalidades

- **Conexão com WhatsApp**: O bot se conecta ao WhatsApp Web via QR Code e escuta mensagens recebidas.
- **Processamento de Mensagens**:
  - **Áudios**: Transcreve áudios recebidos usando o Google Speech-to-Text.
  - **Imagens**: Extrai textos de imagens usando o Google Vision.
- **Envio de Mensagens**: Permite o envio de mensagens via API REST.
- **Webhooks**: Envia os resultados processados para webhooks configurados.

## Pré-requisitos

1. **Node.js**: Certifique-se de ter o Node.js instalado. Você pode baixá-lo [aqui](https://nodejs.org/).
2. **FFmpeg**: O FFmpeg é necessário para conversão de áudios. Instale-o seguindo as instruções no site oficial: [FFmpeg](https://ffmpeg.org/).
3. **Conta no Google Cloud**: Para usar as APIs do Google Speech-to-Text e Vision, você precisará de uma conta no Google Cloud Platform (GCP).

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/seu-repositorio.git
   cd seu-repositorio
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as credenciais do Google Cloud (veja a seção abaixo).

4. Inicie o bot:
   ```bash
   node index.js
   ```

## Configuração das Credenciais do Google Cloud

Para autenticar as bibliotecas do Google Cloud (`@google-cloud/speech` e `@google-cloud/vision`), siga os passos abaixo:

### 1. Ative as APIs no Google Cloud Console

- Acesse o [Google Cloud Console](https://console.cloud.google.com/).
- Crie um novo projeto ou selecione um existente.
- No menu lateral, vá para **APIs e Serviços > Biblioteca**.
- Pesquise e ative as seguintes APIs:
  - **Google Speech-to-Text API**
  - **Google Vision API**

### 2. Gere o Arquivo de Credenciais

- No menu lateral, vá para **APIs e Serviços > Credenciais**.
- Clique em **Criar Credenciais** e selecione **Conta de Serviço**.
- Preencha os detalhes da conta de serviço e clique em **Criar**.
- Na próxima tela, conceda as permissões necessárias (por exemplo, `Editor`) e clique em **Continuar**.
- Clique em **Concluir**.
- Na lista de contas de serviço, clique no email da conta que você acabou de criar.
- Vá para a aba **Chaves** e clique em **Adicionar Chave > Criar Nova Chave**.
- Escolha o formato **JSON** e clique em **Criar**.
- O arquivo JSON será baixado automaticamente.

### 3. Renomeie e Coloque o Arquivo na Raiz do Projeto

- Renomeie o arquivo JSON baixado para `google.json`.
- Mova o arquivo `google.json` para a raiz do seu projeto.

### 4. Defina a Variável de Ambiente

No código, a variável de ambiente `GOOGLE_APPLICATION_CREDENTIALS` já está configurada para apontar para o arquivo `google.json`:
```javascript
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./google.json";
```

## Uso

### Iniciar o Bot

Execute o comando abaixo para iniciar o bot:
```bash
node api.js
```

O bot exibirá um QR Code no terminal. Escaneie-o com o WhatsApp no seu celular para conectar.

### Enviar Mensagens via API

Você pode enviar mensagens via API REST para o bot. Exemplo de requisição:

**Endpoint**: `POST http://localhost:3000/send`

**Body**:
```json
{
  "number": "5511999999999",
  "message": "Olá, isso é um teste!"
}
```

**Resposta**:
```json
{
  "success": true,
  "message": "Mensagem enviada para 5511999999999"
}
```

### Webhooks

O bot envia os resultados processados (transcrições de áudio ou textos extraídos de imagens) para os webhooks configurados no código. Você pode modificar os webhooks no array `webhooks` na função `sendToWebhooks`.

## Estrutura do Projeto

- **api.js**: Arquivo principal do bot, contendo a lógica de conexão com o WhatsApp, processamento de mensagens e integração com as APIs do Google.
- **google.json**: Arquivo de credenciais do Google Cloud (não versionado por questões de segurança).
- **downloads/**: Pasta onde as mídias recebidas são salvas.
- **tokens/**: Pasta onde os tokens de sessão do WhatsApp são armazenados.

## Dependências

- **express**: Framework para criar o servidor HTTP.
- **@wppconnect-team/wppconnect**: Biblioteca para conectar e interagir com o WhatsApp.
- **qrcode-terminal**: Gera QR Codes no terminal para autenticação no WhatsApp.
- **node-fetch**: Faz requisições HTTP para enviar dados aos webhooks.
- **@google-cloud/speech**: Biblioteca do Google para transcrição de áudios.
- **@google-cloud/vision**: Biblioteca do Google para detecção de textos em imagens.
- **fluent-ffmpeg**: Biblioteca para manipulação de áudios e vídeos.

## Contribuição

Sinta-se à vontade para contribuir com melhorias, correções de bugs ou novas funcionalidades. Abra uma **issue** ou envie um **pull request**.

## Licença

Este projeto está licenciado sob a licença AGPL. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

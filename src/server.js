import 'dotenv/config';
import { createApp } from './app.js';
import { createLlmService, getLlmRuntimeConfig } from './llm-service.js';

const port = Number.parseInt(process.env.PORT || '3000', 10);
const app = createApp({ llmService: createLlmService() });
app.listen(port, () => {
  const llm = getLlmRuntimeConfig();
  console.log(`Fiche Expert Auto API disponible sur http://localhost:${port}`);
  console.log(`Fournisseur LLM: ${llm.provider} — modèle: ${llm.model}`);
  if (!llm.configured) console.warn('Attention: la clé du fournisseur LLM est absente. Les routes IA renverront 503.');
});

import 'dotenv/config';
import { createApp } from './app.js';
import { createLlmService } from './llm-service.js';

const port = Number.parseInt(process.env.PORT || '3000', 10);
const app = createApp({ llmService: createLlmService() });
app.listen(port, () => console.log(`Fiche Expert Auto API disponible sur http://localhost:${port}`));

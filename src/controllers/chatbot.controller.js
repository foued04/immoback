const { GoogleGenerativeAI } = require('@google/generative-ai');
const Property = require('../models/Property.model');
const RentalRequest = require('../models/RentalRequest.model');

const CHATBOT_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro'];

const getSystemContext = async (user) => {
  const stats = {
    totalProperties: await Property.countDocuments({ moderationStatus: 'approved' }),
    availableProperties: await Property.countDocuments({ status: 'available', moderationStatus: 'approved' }),
    cities: await Property.distinct('city', { moderationStatus: 'approved' }),
  };

  let userContext = '';
  if (user) {
    const userRequests = await RentalRequest.find({ tenant: user._id }).populate('property');
    const userProperties = await Property.find({ owner: user._id });

    userContext = `\nInformations sur l'utilisateur actuel (${user.role}):
    - Nom: ${user.fullName}
    - Role: ${user.role}
    ${user.role === 'tenant' ? `- Mes demandes de location: ${userRequests.length}` : `- Mes proprietes listees: ${userProperties.length}`}
    `;

    if (user.role === 'tenant' && userRequests.length > 0) {
      userContext += '\nStatut de mes demandes recentes:\n' + userRequests
        .map((request) => `- ${request.property?.title || 'Bien inconnu'}: ${request.status}`)
        .join('\n');
    }
  }

  const cities = stats.cities.length ? stats.cities.join(', ') : 'Tunisie';

  return `Tu es l'assistant intelligent d'ImmoSmart, une plateforme immobiliere premium en Tunisie.
Ta mission est d'aider les utilisateurs a naviguer dans l'application et a repondre a leurs questions sur les services d'ImmoSmart.

CONTEXTE DE L'APPLICATION:
- Nom: ImmoSmart.
- Services: Location de proprietes, gestion de mobilier, contrats numeriques.
- Types de logements: S+0, S+1, S+2, S+3, S+4, Villa.
- Localisations disponibles: ${cities}.
- Statistiques actuelles: ${stats.availableProperties} proprietes disponibles sur un total de ${stats.totalProperties}.

REGLES CRITIQUES:
1. Reponds uniquement aux questions concernant ImmoSmart, l'immobilier sur la plateforme, ou le fonctionnement de l'application.
2. Si l'utilisateur pose une question hors sujet, reponds poliment que tu es specialise uniquement dans l'assistance ImmoSmart.
3. Garde un ton professionnel, accueillant et expert.
4. Reponds en francais par defaut, mais adapte-toi si l'utilisateur change de langue.
5. Ne mentionne pas de donnees sensibles comme les mots de passe.
${userContext}

GUIDE DES FONCTIONNALITES:
- Proprietaires: Peuvent ajouter des biens, gerer les demandes, choisir des packs de meubles.
- Locataires: Peuvent chercher des biens, soumettre des dossiers, suivre leurs demandes, signer des contrats.
- Mobilier: ImmoSmart propose des options de meubles (Non meuble, Semi-meuble, Meuble, Meuble haut standing).
- Securite: Chaque compte est verifie et les annonces sont moderees.`;
};

const buildFriendlyChatbotError = (error) => {
  const rawMessage = error?.message || 'Erreur inconnue';
  const message = rawMessage.toLowerCase();

  if (message.includes('api key not valid') || message.includes('api_key_invalid') || message.includes('invalid api key')) {
    return "La cle Gemini du serveur est invalide. Verifiez GEMINI_API_KEY sur le backend deploye.";
  }

  if (message.includes('quota') || message.includes('rate limit') || message.includes('resource_exhausted')) {
    return "Le service IA a atteint sa limite d'utilisation. Reessayez plus tard ou verifiez le quota Gemini.";
  }

  if (message.includes('permission denied') || message.includes('forbidden') || message.includes('access')) {
    return "Le serveur n'a pas acces au modele Gemini configure. Verifiez les droits de la cle API.";
  }

  if (message.includes('not found') || message.includes('404') || message.includes('model')) {
    return "Le modele Gemini configure n'est pas disponible pour cette cle API. Verifiez le modele et la configuration du compte.";
  }

  if (message.includes('fetch') || message.includes('network') || message.includes('timeout') || message.includes('unavailable')) {
    return "Le serveur n'a pas pu joindre le service IA. Verifiez la connexion du backend ou reessayez dans un instant.";
  }

  return `Le serveur chatbot a echoue: ${rawMessage}`;
};

const createChatHistory = (systemPrompt, history) => ([
  { role: 'user', parts: [{ text: systemPrompt }] },
  { role: 'model', parts: [{ text: "Compris. Je suis l'assistant ImmoSmart et je ne repondrai qu'aux questions concernant cette plateforme et ses services. Comment puis-je vous aider aujourd'hui ?" }] },
  ...(Array.isArray(history) ? history : []),
]);

const sendMessageWithFallback = async (genAI, systemPrompt, history, message) => {
  const failures = [];

  for (const modelName of CHATBOT_MODELS) {
    try {
      console.log(`Sending chatbot message with model: ${modelName}`);

      const model = genAI.getGenerativeModel({ model: modelName });
      const chat = model.startChat({
        history: createChatHistory(systemPrompt, history),
        generationConfig: {
          maxOutputTokens: 500,
        },
      });

      return await chat.sendMessage(message);
    } catch (error) {
      failures.push(`${modelName}: ${error.message}`);
      console.error(`Chatbot model ${modelName} failed:`, error.message);
    }
  }

  const aggregateError = new Error(failures.join(' | '));
  aggregateError.name = 'ChatbotModelError';
  throw aggregateError;
};

exports.askChatbot = async (req, res) => {
  try {
    const { message, history } = req.body;
    const user = req.user;

    console.log('Chatbot request received:', {
      message,
      historyLength: history?.length,
      user: user?.email,
    });

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        message: 'Le message du chatbot est vide.',
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('Chatbot error: GEMINI_API_KEY is missing');
      return res.status(500).json({
        message: "Le service chatbot n'est pas configure sur le serveur. Ajoutez GEMINI_API_KEY dans les variables d'environnement du backend.",
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const systemPrompt = await getSystemContext(user);
    const result = await sendMessageWithFallback(genAI, systemPrompt, history, String(message));
    const response = await result.response;
    const text = response.text();

    console.log('Gemini responded successfully');
    return res.json({ response: text });
  } catch (error) {
    const friendlyMessage = buildFriendlyChatbotError(error);

    console.error('Detailed chatbot error:', error);
    return res.status(500).json({
      message: friendlyMessage,
      error: error?.message || 'Erreur inconnue',
    });
  }
};
